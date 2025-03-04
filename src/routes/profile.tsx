import { styled } from "styled-components";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ITweet } from "../components/timeline";
import Tweet from "../components/tweet";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
`;
const AvatarUpload = styled.label`
  width: 80px;
  overflow: hidden;
  height: 80px;
  border-radius: 50%;
  background-color: #1d9bf0;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  svg {
    width: 50px;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
`;
const AvatarInput = styled.input`
  display: none;
`;
const Name = styled.span`
  font-size: 22px;
`;

const Tweets = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
`;

// 이미지 압축 함수 (1MB 미만 보장)
const compressImage = (file: File, maxSizeMB: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let width = img.width;
      let height = img.height;
      const maxBytes = maxSizeMB * 1024 * 1024; // 1MB = 1048576 bytes

      // 해상도 줄이기 (최대 800x800)
      const MAX_DIMENSION = 800;
      if (width > height && width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9; // 초기 품질 높게 시작
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      // Base64 데이터 크기를 바이트로 계산 (Base64는 약 4/3배 크기)
      const byteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);

      // 크기가 1MB를 초과하면 품질과 해상도를 조정
      while (byteLength > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        const newByteLength =
          (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);
        if (newByteLength > maxBytes && width > 200 && height > 200) {
          width *= 0.9; // 해상도 10% 감소
          height *= 0.9;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
      }

      // 최종 크기 확인
      const finalByteLength =
        (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);
      console.log(`Compressed size: ${(finalByteLength / 1024).toFixed(2)} KB`);
      if (finalByteLength > maxBytes) {
        reject(new Error("Failed to compress image below 1MB"));
      } else {
        resolve(dataUrl);
      }
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState<string | null>(user?.photoURL || null);
  const [tweets, setTweets] = useState<ITweet[]>([]);

  // 프로필 데이터 가져오기
  const fetchProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const { avatar } = profileSnap.data();
      setAvatar(avatar || null);
    }
  };

  // 아바타 변경 핸들러
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!user || !files || files.length !== 1) return;

    try {
      const file = files[0];
      // 이미지 1MB 미만으로 압축 후 Base64로 변환
      const compressedBase64 = await compressImage(file, 1);
      setAvatar(compressedBase64);

      // Firestore "profiles" 컬렉션에 저장
      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(
        profileRef,
        {
          avatar: compressedBase64,
          updatedAt: Date.now(),
          userId: user.uid
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Avatar update error:", e);
      alert(
        "An error occurred while updating the avatar. Please try a smaller image."
      );
    }
  };

  // 트윗 가져오기
  const fetchTweets = async () => {
    if (!user) return;
    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user?.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const snapshot = await getDocs(tweetQuery);
    const tweets = snapshot.docs.map((doc) => {
      const { tweet, createdAt, userId, username, photo } = doc.data();
      return {
        tweet,
        createdAt,
        userId,
        username,
        photo,
        id: doc.id,
      };
    });
    setTweets(tweets);
  };

  useEffect(() => {
    fetchProfile();
    fetchTweets();
  }, []);

  return (
    <Wrapper>
      <AvatarUpload htmlFor="avatar">
        {avatar ? (
          <AvatarImg src={avatar} />
        ) : (
          <svg
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        )}
      </AvatarUpload>
      <AvatarInput
        onChange={onAvatarChange}
        id="avatar"
        type="file"
        accept="image/*"
      />
      <Name>{user?.displayName ?? "Anonymous"}</Name>
      <Tweets>
        {tweets.map((tweet) => (
          <Tweet key={tweet.id} {...tweet} />
        ))}
      </Tweets>
    </Wrapper>
  );
}
