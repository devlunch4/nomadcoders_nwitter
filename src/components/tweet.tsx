import { styled } from "styled-components";
import { ITweet } from "./timeline";
import { auth, db } from "../firebase";
import { deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore"; // getDoc 추가
import { useState, useEffect } from "react";

// profiles 문서의 타입 정의
interface IProfile {
  nickname?: string;
}

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

const Nickname = styled.span`
  font-weight: 400;
  font-size: 14px;
  color: #888;
  margin-left: 5px;
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

const compressImage = (file: File, maxSizeMB: number): Promise<File> => {
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
  nickname: propNickname, // Timeline에서 전달된 nickname (필요 시 사용)
  photo,
  tweet,
  userId,
  id,
}: ITweet) {
  const dateValue = new Date(createdAt);
  const localDate = dateValue.toLocaleString();
  const user = auth.currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [editedTweet, setEditedTweet] = useState(tweet);
  const [editedPhoto, setEditedPhoto] = useState<string | null>(photo || null);
  const [currentUserNickname, setCurrentUserNickname] = useState<string>(""); // 로그인한 사용자의 nickname 상태

  // 로그인한 사용자의 nickname 가져오기
  useEffect(() => {
    const fetchCurrentUserNickname = async () => {
      if (user) {
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists()
          ? (profileSnap.data() as IProfile)
          : null;
        const fetchedNickname = profileData?.nickname || user.displayName || "No nickname";
        setCurrentUserNickname(fetchedNickname);
      }
    };
    fetchCurrentUserNickname();
  }, [user]);

  const onDelete = async () => {
    const ok = confirm("Are you sure you want to delete this tweet?");
    if (!ok || user?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, "tweets", id));
      console.log(`**Deleted tweet ID: ${id}`);
    } catch (e) {
      console.log(e);
      alert("An error occurred while deleting the tweet.");
    }
  };

  const onEdit = () => {
    if (user?.uid !== userId) return;
    setIsEditing(true);
  };

  const onChangeEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTweet(e.target.value);
  };

  const onRemovePhoto = () => {
    setEditedPhoto(null);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file, 1);
      const reader = new FileReader();
      reader.onload = () => {
        setEditedPhoto(reader.result as string);
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
        tweet: editedTweet,
        photo: editedPhoto,
      });
      setIsEditing(false);
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

  // 표시할 nickname 결정: 로그인한 사용자가 트윗 작성자라면 currentUserNickname 사용
  const displayNickname =
    user?.uid === userId ? currentUserNickname : propNickname || "No nickname";

  return (
    <Wrapper>
      {isEditing ? (
        <>
          <Column>
            <Username>{username}</Username>
            <Nickname>({displayNickname})</Nickname>
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
          <Column>
            <Username>{username}</Username>
            <Nickname>({displayNickname})</Nickname>
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