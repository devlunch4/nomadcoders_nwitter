import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  doc, // doc 임포트 추가
  getDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { styled } from "styled-components";
import { db } from "../firebase";
import Tweet from "./tweet";
import { Unsubscribe } from "firebase/auth";

// profiles 문서의 타입 정의
interface IProfile {
  nickname?: string;
}

export interface ITweet {
  id: string;
  photo?: string;
  tweet: string;
  userId: string;
  username: string;
  nickname?: string; // nickname 추가
  createdAt: number;
}

const Wrapper = styled.div`
  display: flex;
  gap: 10px;
  flex-direction: column;
  overflow-y: scroll;
`;

export default function Timeline() {
  const [tweets, setTweets] = useState<ITweet[]>([]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    const fetchTweets = async () => {
      const tweetsQuery = query(
        collection(db, "tweets"),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      unsubscribe = onSnapshot(tweetsQuery, async (snapshot) => {
        const tweets = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const { tweet, createdAt, userId, username, photo } =
              docSnapshot.data();
            // profiles에서 nickname 가져오기
            const profileRef = doc(db, "profiles", userId);
            const profileSnap = await getDoc(profileRef);
            const profileData = profileSnap.exists()
              ? (profileSnap.data() as IProfile)
              : null;
            const nickname = profileData?.nickname || username;

            return {
              tweet,
              createdAt,
              userId,
              username,
              nickname, // nickname 추가
              photo,
              id: docSnapshot.id,
            };
          })
        );
        setTweets(tweets);
      });
    };
    fetchTweets();
    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  return (
    <Wrapper>
      {tweets.map((tweet) => (
        <Tweet key={tweet.id} {...tweet} />
      ))}
    </Wrapper>
  );
}