import { styled } from "styled-components";
import PostTweetForm from "../components/post-tweet-form";
import Timeline from "../components/timeline";

const Wrapper = styled.div`
  display: grid;
  gap: 50px;
  overflow-y: scroll;
  grid-template-rows: 1fr 5fr;
`;

const Footer = styled.footer`
  text-align: center;
  padding: 10px;
  font-size: 20px;
  color: gray;
  background-color: #f9f9f9;
  border-radius: 10px;
  margin-top: 20px;
`;

export default function Home() {
  return (
    <Wrapper>
      <PostTweetForm />
      <Timeline />
      <Footer>
        © 2025 <a href="mailto:devlunch4@gmail.com">devlunch4@gmail.com</a> All
        rights reserved.
      </Footer>
    </Wrapper>
  );
}
