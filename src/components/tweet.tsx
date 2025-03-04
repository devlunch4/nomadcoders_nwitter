import { styled } from "styled-components";
import { ITweet } from "./timeline";
import {
  auth,
  db,
  // storage
} from "../firebase";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

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

const ChangePhotoButton = styled.label`
  background-color: teal;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  display: inline-block;
`;

const HiddenFileInput = styled.input`
  display: none;
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

// 이미지 압축 함수
const compressImage = (file: File, maxSizeMB: number): Promise<File> => {
  console.log(
    "**File size will be reduced to 1MB.\nImage quality may decrease."
  );
  alert("File size will be reduced to 1MB.\nImage quality may decrease.");
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

      let quality = 0.7;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > maxBytes && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
          });
          resolve(compressedFile);
        })
        .catch(reject);
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedTweet, setEditedTweet] = useState(tweet);
  const [editedPhoto, setEditedPhoto] = useState<string | null>(photo || null);

  const onDelete = async () => {
    const ok = confirm("Are you sure you want to delete this tweet?");
    if (!ok || user?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, "tweets", id));
      console.log(`**Deleted tweet ID: ${id}`);
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
    if (user?.uid !== userId) return;
    setIsEditing(true);
  };

  // tweet 텍스트 수정 핸들러
  const onChangeEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTweet(e.target.value);
  };

  // 사진 제거 함수
  const onRemovePhoto = () => {
    setEditedPhoto(null);
  };

  // 사진 변경 핸들러 추가
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1MB 미만으로 압축
      const compressedFile = await compressImage(file, 1);
      const reader = new FileReader();
      reader.onload = () => {
        setEditedPhoto(reader.result as string); // Base64로 미리보기 설정
      };
      reader.readAsDataURL(compressedFile);
    } catch (e) {
      console.log(e);
      alert("An error occurred while compressing the photo.");
    }
  };

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
        tweet: editedTweet, // 변경된 텍스트 저장
        photo: editedPhoto, // 변경된 사진(Base64) 또는 null 저장
      });
      setIsEditing(false); // 편집모드 종료
    } catch (e) {
      console.log(e);
      alert("An error occurred while saving the tweet.");
    }
  };

  const onCancel = () => {
    setEditedTweet(tweet);
    setEditedPhoto(photo || null);
    setIsEditing(false);
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
            <ChangePhotoButton htmlFor="photoInput">
              Change Photo
            </ChangePhotoButton>
            <HiddenFileInput
              id="photoInput"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
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
