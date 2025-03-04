import { styled } from "styled-components";
import { ITweet } from "./timeline";
import {
  auth,
  db,
  // storage
} from "../firebase";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
// import { deleteObject, ref } from "firebase/storage";
import { useState } from "react"; // 상태 관리를 위해 추가

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
`;

const Column = styled.div`
  padding: 5px;
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

const EditButton = styled.button`
  background-color: skyblue;
  color: black;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
`;

const EditInput = styled.textarea`
  margin: 10px 0px;
  font-size: 16px;
  width: 100%;
  padding: 5px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.5);
`;

const SaveButton = styled.button`
  background-color: green;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
`;

const RemovePhotoButton = styled.button`
  background-color: orange;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 5px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
`;

const CancelButton = styled.button`
  background-color: gray;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
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
  const user = auth.currentUser;

  // 편집 상태 관리
  const [isEditing, setIsEditing] = useState(false); // 편집 모드 토글
  const [editedTweet, setEditedTweet] = useState(tweet); // 수정할 텍스트 상태
  const [editedPhoto, setEditedPhoto] = useState<string | null>(photo || null); // 수정할 사진(Base64) 상태

  const onDelete = async () => {
    const ok = confirm("Are you sure you want to delete this tweet?");
    if (!ok || user?.uid !== userId) {
      return;
    }
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
    }
  };

  // 편집 시작 함수
  const onEdit = () => {
    if (user?.uid !== userId) return; // 권한 확인
    setIsEditing(true); // 편집 모드로 전환
  };

  // 텍스트 수정 핸들러
  const onChangeEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTweet(e.target.value);
  };

  // 사진 제거 함수
  const onRemovePhoto = () => {
    setEditedPhoto(null); // 편집 중 사진 제거
  };

  // 편집 저장 함수
  const onSave = async () => {
    if (
      !user ||
      user.uid !== userId ||
      editedTweet === "" ||
      editedTweet.length > 180
    ) {
      alert("Invalid input or no changes made.");
      return;
    }
    try {
      await updateDoc(doc(db, "tweets", id), {
        tweet: editedTweet, // 수정된 텍스트 저장
        photo: editedPhoto, // 수정된 사진(Base64 또는 null) 저장
      });
      setIsEditing(false); // 편집 모드 종료
    } catch (e) {
      console.log(e);
      alert("An error occurred while saving the tweet.");
    }
  };

  // 편집 취소 함수
  const onCancel = () => {
    setEditedTweet(tweet); // 원래 텍스트로 복원
    setEditedPhoto(photo || null); // 원래 사진으로 복원
    setIsEditing(false); // 편집 모드 종료
  };

  return (
    <Wrapper>
      {isEditing ? (
        <>
          {/* 편집 모드인 경우: 텍스트-사진 컬럼 구분 */}
          {/* 왼쪽 컬럼: 트윗 텍스트 수정 */}
          <Column>
            <Username>{username}</Username>
            <EditInput
              value={editedTweet}
              onChange={onChangeEdit}
              maxLength={180}
              required
            />
            <Localdate>{localDate}</Localdate>
            {user?.uid === userId && (
              <>
                <SaveButton onClick={onSave}>Save</SaveButton>
                <CancelButton onClick={onCancel}>Cancel</CancelButton>
              </>
            )}
          </Column>
          {/* 오른쪽 컬럼: 사진 관리 */}
          <Column
            style={{
              marginLeft: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {editedPhoto ? (
              <>
                <Photo src={editedPhoto} />
                <RemovePhotoButton onClick={onRemovePhoto}>
                  Remove Photo
                </RemovePhotoButton>
              </>
            ) : null}
          </Column>
        </>
      ) : (
        <>
          {/* 편집 모드가 아닐 때: 기존 레이아웃 유지 */}
          <Column>
            <Username>{username}</Username>
            <Payload>{tweet}</Payload>
            <Localdate>{localDate}</Localdate>
            {user?.uid === userId && (
              <>
                <EditButton onClick={onEdit}>Edit</EditButton>
                <DeleteButton onClick={onDelete}>Delete</DeleteButton>
              </>
            )}
          </Column>
          <Column style={{ marginLeft: "auto" }}>
            {photo ? <Photo src={photo} /> : null}
          </Column>
        </>
      )}
    </Wrapper>
  );
}
