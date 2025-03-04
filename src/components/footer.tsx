import { styled } from "styled-components";

const Footer = styled.footer`
  text-align: center;
  padding: 15px 10px;
  font-size: 18px;
  color: gray;
  background-color: #f9f9f9;
  border-radius: 10px;
  margin-top: 20px;
  line-height: 1.6; 
  width: 100%
`;

export default function Fotter() {
  return (
    <Footer>
    © 2025 <a href="mailto:devlunch4@gmail.com">devlunch4@gmail.com</a>
    <br/>All rights reserved.
    </Footer>
  );
}
