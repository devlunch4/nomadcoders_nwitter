import { styled } from "styled-components";
import { ITweet } from "./timeline";
import {
  auth,
  db,
  // storage
} from "../firebase";
import { deleteDoc, doc } from "firebase/firestore";
// import { deleteObject, ref } from "firebase/storage";

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
`;

const Column = styled.div`
  &:last-child {
    place-self: end;
  }
`;

const Photo = styled.img`
  width: auto;
  height: 100px;
  border-radius: 15px;
`;

const Username = styled.span`
  font-weight: 600;
  font-size: 15px;
`;

const Payload = styled.p`
  margin: 10px 0px;
  font-size: 18px;
`;

const Localdate = styled.p`
  margin: 10px 0px;
  font-size: 15px;
`;

const DeleteButton = styled.button`
  background-color: tomato;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
`;

export default function Tweet({
  createdAt,
  username,
  photo,
  tweet,
  userId,
  id,
}: ITweet) {
  // date set
  const dateValue = new Date(createdAt);
  const localDate = dateValue.toLocaleString();

  // current user set
  const user = auth.currentUser;
  const onDelete = async () => {
    /* for test */
    // const ok = true;
    
    const ok = confirm("Are you sure you want to delete this tweet?");

    if (!ok || user?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, "tweets", id));
      console.log(`Deleted tweet ID: ${id}`);
      // Firestore 문서 삭제 (photo가 Base64로 포함되어 있으므로 별도 Storage 삭제 불필요)
      /* if (photo) {
        const photoRef = ref(storage, `tweets/${user.uid}/${id}`);
        await deleteObject(photoRef);
      }
      */
    } catch (e) {
      console.log(e);
      // 에러 발생 시 사용자 알림 추가
      alert("An error occurred while deleting the tweet.");
    } finally {
      //
    }
  };
  return (
    <Wrapper>
      <Column>
        <Username>{username}</Username>
        <Payload>{tweet}</Payload>
        <Localdate>{localDate}</Localdate>
        {user?.uid === userId ? (
          <DeleteButton onClick={onDelete}>Delete</DeleteButton>
        ) : null}
      </Column>
      {/* Base64 문자열을 이미지로 표시 */}
      <Column style={{ marginLeft: "auto" }}>
        {photo ? <Photo src={photo} /> : null}
      </Column>
    </Wrapper>
  );
}
