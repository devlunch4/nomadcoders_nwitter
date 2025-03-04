import { styled } from "styled-components";
import { auth, db } from "../firebase";
import { useEffect, useState, useRef } from "react";
import { doc, setDoc, getDoc, QueryDocumentSnapshot, onSnapshot, getDocs } from "firebase/firestore";
import {
  collection,
  limit,
  orderBy,
  query,
  where,
  startAfter,
} from "firebase/firestore";
import { ITweet } from "../components/timeline";
import Tweet from "../components/tweet";
import Footer from "../components/footer";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 50px;
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

const NoTweetsMessage = styled.p`
  font-size: 16px;
  color: #666;
  text-align: center;
`;

const LoadingMessage = styled.p`
  font-size: 16px;
  color: #666;
  text-align: center;
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
      const maxBytes = maxSizeMB * 1024 * 1024;

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

      let quality = 0.9;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      const byteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);

      while (byteLength > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        const newByteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);
        if (newByteLength > maxBytes && width > 200 && height > 200) {
          width *= 0.9;
          height *= 0.9;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
      }

      const finalByteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);
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
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
      const compressedBase64 = await compressImage(file, 1);
      setAvatar(compressedBase64);

      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(
        profileRef,
        {
          avatar: compressedBase64,
          updatedAt: Date.now(),
          userId: user.uid,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Avatar update error:", e);
      alert("An error occurred while updating the avatar. Please try a smaller image.");
    }
  };

  // 트윗 가져오기 (초기 및 추가 로드)
  const fetchTweets = async (isInitialLoad = false) => {
    if (!user || !hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const tweetQuery = query(
        collection(db, "tweets"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5),
        ...(lastDoc && !isInitialLoad ? [startAfter(lastDoc)] : [])
      );

      const snapshot = await getDocs(tweetQuery);
      console.log("Fetched tweet docs:", snapshot.docs.length);
      console.log("Last doc ID:", lastDoc?.id);

      const newTweets = snapshot.docs.map((doc) => {
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

      const uniqueTweets = isInitialLoad
        ? newTweets
        : newTweets.filter((newTweet) => !tweets.some((t) => t.id === newTweet.id));

      if (isInitialLoad) {
        setTweets(uniqueTweets);
      } else if (uniqueTweets.length > 0) {
        setTweets((prev) => {
          const combined = [...prev, ...uniqueTweets];
          return Array.from(new Map(combined.map((tweet) => [tweet.id, tweet])).values());
        });
      }

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      if (snapshot.docs.length < 5 || uniqueTweets.length === 0) {
        setHasMore(false);
        console.log("No more tweets to load.");
      }
    } catch (e) {
      console.error("Error fetching tweets:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 실시간 트윗 리스너 설정
  useEffect(() => {
    if (!user) return;

    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5) // 초기 5개만 실시간 감지
    );

    const unsubscribe = onSnapshot(tweetQuery, (snapshot) => {
      const updatedTweets = snapshot.docs.map((doc) => {
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
      setTweets(updatedTweets); // 실시간으로 초기 5개 업데이트
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 5); // 5개면 더 가져올 가능성 있음
    });

    return () => unsubscribe(); // 컴포넌트 언마운트 시 리스너 정리
  }, [user]);

  // 무한 스크롤 감지 (추가 로드는 여전히 fetchTweets 사용)
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchTweets();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current && loadMoreRef.current) {
        observer.current.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isLoading, lastDoc]);

  // 초기 프로필 로드
  useEffect(() => {
    fetchProfile();
  }, [user]);

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
        {tweets.length > 0 ? (
          tweets.map((tweet) => <Tweet key={tweet.id} {...tweet} />)
        ) : (
          <NoTweetsMessage>No tweets found.</NoTweetsMessage>
        )}
      </Tweets>
      {hasMore && (
        <div ref={loadMoreRef}>
          {isLoading && <LoadingMessage>Loading more tweets...</LoadingMessage>}
        </div>
      )}
      <Footer />
    </Wrapper>
  );
}