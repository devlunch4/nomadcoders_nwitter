import { addDoc, collection, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { styled } from "styled-components";
import {
  auth,
  db,
  //storage
} from "../firebase";
// import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TextArea = styled.textarea`
  border: 2px solid white;
  padding: 20px;
  border-radius: 20px;
  font-size: 16px;
  color: white;
  background-color: black;
  width: 100%;
  resize: none;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  &::placeholder {
    font-size: 16px;
  }
  &:focus {
    outline: none;
    border-color: #1d9bf0;
  }
`;

const AttachFileButton = styled.label`
  padding: 10px 0px;
  color: #1d9bf0;
  text-align: center;
  border-radius: 20px;
  border: 1px solid #1d9bf0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

const AttachFileInput = styled.input`
  display: none;
`;

const SubmitBtn = styled.input`
  background-color: #1d9bf0;
  color: white;
  border: none;
  padding: 10px 0px;
  border-radius: 20px;
  font-size: 16px;
  cursor: pointer;
  &:hover,
  &:active {
    opacity: 0.9;
  }
`;

export default function PostTweetForm() {
  const [isLoading, setLoading] = useState(false);
  const [tweet, setTweet] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTweet(e.target.value);
  };

  // 이미지 압축 함수 추가
  // 이유: 파일 크기가 클 경우 자동으로 압축하여 1MB 미만으로 맞춤
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
        const maxBytes = maxSizeMB * 1024 * 1024; // 최대 크기를 바이트로 변환

        // 초기 품질 설정
        let quality = 0.7;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 캔버스를 JPEG로 변환하며 크기 조정
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > maxBytes && quality > 0.1) {
          quality -= 0.1; // 품질을 낮춰가며 크기 조정
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Base64를 Blob으로 변환
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

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length === 1) {
      let selectedFile = files[0];
      // 파일 크기가 1MB 이상일 경우 사용자 확인 후 추가-업로드
      // 이유: 사용자가 압축 여부를 선택할 수 있도록 함
      if (selectedFile.size >= 1048576) {
        // confirm을 사용해 간단한 모달 대화창 표시
        // 사용자가 "확인"을 누르면 true, "취소"를 누르면 false 반환
        const shouldCompress = confirm(
          "The file size exceeds 1MB. \n Do you want to compress it before uploading?"
        );

        // 사용자가 "취소"를 선택하면 파일 선택을 취소하고 종료
        // 이유: 사용자의 선택을 존중하며 불필요한 처리를 방지
        if (!shouldCompress) {
          e.target.value = ""; // 파일 입력 초기화
          return;
        }

        // 사용자가 "확인"을 선택한 경우 압축 진행
        try {
          selectedFile = await compressImage(selectedFile, 1); // 1MB로 압축
        } catch (error) {
          console.error("Image compression failed:", error);
          alert("An error occurred while processing the image.");
          return;
        }
      }
      setFile(selectedFile);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || isLoading || tweet === "" || tweet.length > 180) return;
    try {
      setLoading(true);
      const doc = await addDoc(collection(db, "tweets"), {
        tweet,
        createdAt: Date.now(),
        username: user.displayName || "Anonymous",
        userId: user.uid,
      });

      if (file) {
        // FileReader를 사용하여 파일을 Base64로 변환
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            resolve(
              updateDoc(doc, {
                photo: base64String, // Base64 문자열을 photo 필드에 저장
              })
            );
          };
          reader.readAsDataURL(file);
        });
      }
      setTweet("");
      setFile(null);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={onSubmit}>
      <TextArea
        required
        rows={5}
        maxLength={180}
        onChange={onChange}
        value={tweet}
        placeholder="What is happening?!"
      />
      <AttachFileButton htmlFor="file">
        {file ? "Photo added ✅" : "Add photo"}
      </AttachFileButton>
      <AttachFileInput
        onChange={onFileChange}
        type="file"
        id="file"
        accept="image/*"
      />
      <SubmitBtn
        type="submit"
        value={isLoading ? "Posting..." : "Post Tweet"}
      />
    </Form>
  );
}
