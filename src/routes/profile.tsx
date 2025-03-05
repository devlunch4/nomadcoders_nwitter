import { styled } from "styled-components";
import { auth, db } from "../firebase";
import { useEffect, useState, useRef } from "react";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
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

// 스타일 컴포넌트 정의
const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 50px;
`;

const AvatarUpload = styled.label`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #1d9bf0;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
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

const NicknameInput = styled.input`
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 10px;
`;

const Tweets = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
`;

const SaveBtn = styled.button`
  padding: 8px 16px;
  background-color: #1d9bf0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const CancelBtn = styled.button`
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const EditBtn = styled.button`
  padding: 8px 16px;
  background-color: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
`;

const Message = styled.p`
  font-size: 16px;
  color: #666;
  text-align: center;
`;

// 이미지 압축 함수 (기존 유지)
const compressProfileImage = (
  file: File,
  maxSizeMB: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => (img.src = e.target?.result as string);
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
      let byteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);

      while (byteLength > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        byteLength = (dataUrl.length * 3) / 4 - (dataUrl.indexOf(",") + 1);
        if (byteLength > maxBytes && width > 200 && height > 200) {
          width *= 0.9;
          height *= 0.9;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
      }

      console.log(`Compressed size: ${(byteLength / 1024).toFixed(2)} KB`);
      byteLength > maxBytes
        ? reject(new Error("Failed to compress image below 1MB"))
        : resolve(dataUrl);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState<string | null>(user?.photoURL || null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [tweets, setTweets] = useState<ITweet[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nickname, setNickname] = useState<string>("");
  const [editNickname, setEditNickname] = useState<string>("");
  const [isEditingNickname, setIsEditingNickname] = useState(false); // 닉네임 편집 모드 상태 추가
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 프로필 데이터 가져오기
  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      setAvatar(data.avatar || null);
      setNickname(data.nickname || user.displayName || "Anonymous");
    } else {
      // 프로필이 없으면 초기값 설정
      setNickname(user.displayName || "Anonymous");
      await setDoc(profileRef, {
        nickname: user.displayName || "Anonymous",
        userId: user.uid,
        createdAt: Date.now(),
      }, { merge: true });
    }
  };

  // 아바타 미리보기 업데이트
  // Update avatar preview
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length !== 1) return;
    try {
      const compressedBase64 = await compressProfileImage(e.target.files[0], 1);
      setPreviewAvatar(compressedBase64);
    } catch (e) {
      console.error("Avatar compression error:", e);
    }
  };

  // 아바타 저장
  // Save avatar
  const saveAvatar = async () => {
    if (!user || !previewAvatar) return;
    setIsSaving(true);
    try {
      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(
        profileRef,
        { avatar: previewAvatar, updatedAt: Date.now() },
        { merge: true }
      );
      setAvatar(previewAvatar);
      setPreviewAvatar(null);
    } catch (e) {
      console.error("Avatar save error:", e);
      alert("Failed to save avatar. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 아바타 변경 취소
  // Cancel avatar change
  const cancelAvatarChange = () => setPreviewAvatar(null);

  // 닉네임 저장
  // NickName savck
  const saveNickname = async () => {
    if (!user || !editNickname || editNickname === nickname) return;
    setIsSaving(true);
    try {
      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(
        profileRef,
        { nickname: editNickname, updatedAt: Date.now() },
        { merge: true }
      );
      setNickname(editNickname);
      setEditNickname("");
      setIsEditingNickname(false); // 저장 후 편집 모드 종료
    } catch (e) {
      console.error("Nickname save error:", e);
      alert("Failed to save nickname. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 닉네임 편집 모드 토글
  // Toggle nickname editing mode
  const toggleEditNickname = () => {
    setIsEditingNickname((prev) => !prev);
    if (!isEditingNickname) setEditNickname(nickname); // 편집 시작 시 현재 닉네임으로 초기화
  };

  // 트윗 가져오기
  // Fetch tweets
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
      const newTweets = snapshot.docs.map((doc) => ({
        tweet: doc.data().tweet,
        createdAt: doc.data().createdAt,
        userId: doc.data().userId,
        username: doc.data().username,
        photo: doc.data().photo,
        id: doc.id,
      }));

      setTweets((prev) =>
        isInitialLoad
          ? newTweets
          : [
              ...prev,
              ...newTweets.filter((t) => !prev.some((p) => p.id === t.id)),
            ]
      );
      if (snapshot.docs.length > 0)
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      if (snapshot.docs.length < 5) setHasMore(false);
    } catch (e) {
      console.error("Error fetching tweets:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 실시간 트윗 업데이트 및 초기 로드
  // Real-time tweet updates and initial load
  useEffect(() => {
    if (!user) return;
    fetchProfile();
    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(tweetQuery, (snapshot) => {
      const updatedTweets = snapshot.docs.map((doc) => ({
        tweet: doc.data().tweet,
        createdAt: doc.data().createdAt,
        userId: doc.data().userId,
        username: doc.data().username,
        photo: doc.data().photo,
        id: doc.id,
      }));
      setTweets(updatedTweets);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 5);
    });
    return () => unsubscribe();
  }, [user]);

  // 무한 스크롤 설정
  // Infinite scroll setup
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) fetchTweets();
      },
      { threshold: 1.0 }
    );
    if (loadMoreRef.current) observer.current.observe(loadMoreRef.current);
    return () => {
      if (observer.current && loadMoreRef.current)
        observer.current.unobserve(loadMoreRef.current);
    };
  }, [hasMore, isLoading]);

  return (
    <Wrapper>
      <AvatarUpload htmlFor="avatar">
        {previewAvatar ? (
          <AvatarImg src={previewAvatar} />
        ) : avatar ? (
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
      {previewAvatar && (
        <>
          <SaveBtn onClick={saveAvatar} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Avatar"}
          </SaveBtn>
          <CancelBtn onClick={cancelAvatarChange} disabled={isSaving}>
            Cancel
          </CancelBtn>
        </>
      )}
      <Name>{nickname}</Name>
      {/* 닉네임 편집 버튼 추가 / Add nickname edit button */}
      <EditBtn onClick={toggleEditNickname}>
        {isEditingNickname ? "Cancel" : "Change NikcName"} 
        {/* Toggle between "Cancel" and "Change Nickname" */}
      </EditBtn>
      {isEditingNickname && (
        <>
          <NicknameInput
            value={editNickname}
            onChange={(e) => setEditNickname(e.target.value)}
            placeholder="Please enter a new nickname"
          />
          <SaveBtn onClick={saveNickname} disabled={isSaving || !editNickname}>
            {isSaving ? "Saving..." : "Save NickName"}
          </SaveBtn>
        </>
      )}
      <Tweets>
        {tweets.length > 0 ? (
          tweets.map((tweet) => <Tweet key={tweet.id} {...tweet} />)
        ) : (
          <Message>No tweets found.</Message>
        )}
      </Tweets>
      {hasMore && (
        <div ref={loadMoreRef}>
          {isLoading && <Message>Loading more tweets...</Message>}
        </div>
      )}
      <Footer />
    </Wrapper>
  );
}