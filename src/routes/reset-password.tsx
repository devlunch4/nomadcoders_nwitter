import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import {
  Error,
  Input,
  Title,
  Wrapper,
  Form,
} from "../components/auth-components";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 이메일 입력값 변경 핸들러
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEmail(e.target.value);

  // 폼 제출 핸들러
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 이메일이 비어있거나 로딩 중이면 실행 중단
    if (!email.trim() || isLoading) return;

    try {
      setLoading(true);
      setError(""); // 이전 에러 초기화
      await sendPasswordResetEmail(auth, email); // 비밀번호 재설정 이메일 전송
      navigate("/login"); // 성공 시 로그인 페이지로 이동
    } catch (error: any) {
      // any로 타입 지정 (혹은 unknown 후 narrowing 가능)
      setError(error.message); // 에러 메시지 표시
    } finally {
      setLoading(false); // 로딩 상태 해제
    }
  };

  return (
    <Wrapper>
      <Title>Reset Password</Title>
      <Form onSubmit={onSubmit}>
        <Input
          type="email"
          value={email}
          onChange={onChange}
          placeholder="Enter your Email"
          required
        />
        <Input
          type="submit"
          value={isLoading ? "Sending..." : "Send Reset Email"}
          disabled={isLoading}
        />
      </Form>
      {error && <Error>{error}</Error>}
    </Wrapper>
  );
}
