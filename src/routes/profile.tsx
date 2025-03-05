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
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { ITweet } from "../components/timeline";
import Tweet from "../components/tweet";
import Footer from "../components/footer";

// Styled components
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
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
  flex-direction: column;
  width: 100%;
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

// Compress image to ensure size is under 1MB
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target?.result as string);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let width = img.width;
      let height = img.height;
      const maxDimension = 800;
      const maxSizeBytes = 1024 * 1024; // 1MB in bytes

      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width *= scale;
        height *= scale;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let size = dataUrl.length * 0.75 - dataUrl.indexOf(",") - 1;

      while (size > maxSizeBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        size = dataUrl.length * 0.75 - dataUrl.indexOf(",") - 1;
      }

      size > maxSizeBytes
        ? reject(new Error("Failed to compress image below 1MB"))
        : resolve(dataUrl);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState<string | null>(user?.photoURL || null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [tweets, setTweets] = useState<ITweet[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nickname, setNickname] = useState<string>("");
  const [editNickname, setEditNickname] = useState<string>("");
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, "profiles", user.uid);
    const profileSnap = await getDoc(profileRef);
    const data = profileSnap.data() || {};
    const newNickname = data.nickname || user.displayName || "Anonymous";
    setAvatar(data.avatar || null);
    setNickname(newNickname);

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        nickname: newNickname,
        userId: user.uid,
        createdAt: Date.now(),
      });
    }
  };

  // Handle avatar change
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!user || !file) return;
    try {
      setPreviewAvatar(await compressImage(file));
    } catch (error) {
      console.error("Error compressing avatar:", error);
    }
  };

  // Save avatar
  const saveAvatar = async () => {
    if (!user || !previewAvatar) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "profiles", user.uid),
        { avatar: previewAvatar, updatedAt: Date.now() },
        { merge: true }
      );
      setAvatar(previewAvatar);
      setPreviewAvatar(null);
    } catch (error) {
      console.error("Error saving avatar:", error);
      alert("Failed to save avatar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save nickname with history
  const saveNickname = async () => {
    if (!user || !editNickname || editNickname === nickname) return;
    setIsSaving(true);
    try {
      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);
      const data = profileSnap.data() || {};
      const beforeNicknames = data.beforeNicknames || [];
      if (nickname) beforeNicknames.push({ nickname, changedAt: Date.now() });

      await setDoc(
        profileRef,
        { nickname: editNickname, beforeNicknames, updatedAt: Date.now() },
        { merge: true }
      );
      setNickname(editNickname);
      setEditNickname("");
      setIsEditingNickname(false);
    } catch (error) {
      console.error("Error saving nickname:", error);
      alert("Failed to save nickname.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle nickname editing
  const toggleEditNickname = () => {
    setIsEditingNickname(!isEditingNickname);
    if (!isEditingNickname) setEditNickname(nickname);
  };

  // Fetch tweets for infinite scroll
  const fetchTweets = async (initial = false) => {
    if (!user || !hasMore || isLoading) return;
    setIsLoading(true);
    try {
      const tweetQuery = query(
        collection(db, "tweets"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5),
        ...(lastDoc && !initial ? [startAfter(lastDoc)] : [])
      );
      const snapshot = await getDocs(tweetQuery);
      const newTweets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ITweet));
      setTweets((prev) =>
        initial
          ? newTweets
          : [...prev, ...newTweets.filter((t) => !prev.some((p) => p.id === t.id))]
      );
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 5);
    } catch (error) {
      console.error("Error fetching tweets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial tweet load and real-time updates
  useEffect(() => {
    if (!user) return;

    fetchProfile();

    // Initial fetch for the first set of tweets
    fetchTweets(true);

    // Real-time updates for new tweets
    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribe = onSnapshot(tweetQuery, (snapshot) => {
      const updatedTweets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ITweet));
      setTweets((prev) => {
        // Merge new tweets with existing ones, avoiding duplicates
        const merged = [...updatedTweets, ...prev.filter((t) => !updatedTweets.some((u) => u.id === t.id))];
        return merged.sort((a, b) => b.createdAt - a.createdAt); // Sort by createdAt descending
      });
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 5);
    });

    return () => unsubscribe();
  }, [user]);

  // Infinite scroll setup
  useEffect(() => {
    if (!user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchTweets(); // Fetch previous tweets on scroll
        }
      },
      { threshold: 1 }
    );
    const ref = loadMoreRef.current;
    if (ref) observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [user, hasMore, isLoading]);

  return (
    <Wrapper>
      <AvatarUpload htmlFor="avatar">
        {previewAvatar || avatar ? (
          <AvatarImg src={previewAvatar || avatar!} />
        ) : (
          <svg fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        )}
      </AvatarUpload>
      <AvatarInput
        id="avatar"
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
      />
      {previewAvatar && (
        <>
          <SaveBtn onClick={saveAvatar} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Avatar"}
          </SaveBtn>
          <CancelBtn onClick={() => setPreviewAvatar(null)} disabled={isSaving}>
            Cancel
          </CancelBtn>
        </>
      )}
      <Name>{nickname}</Name>
      <EditBtn onClick={toggleEditNickname}>
        {isEditingNickname ? "Cancel" : "Change Nickname"}
      </EditBtn>
      {isEditingNickname && (
        <>
          <NicknameInput
            value={editNickname}
            onChange={(e) => setEditNickname(e.target.value)}
            placeholder="Please enter a new nickname"
          />
          <SaveBtn onClick={saveNickname} disabled={isSaving || !editNickname}>
            {isSaving ? "Saving..." : "Save Nickname"}
          </SaveBtn>
        </>
      )}
      <Tweets>
        {tweets.length ? (
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