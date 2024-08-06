import React, { useEffect } from "react";
import Prism from "prismjs";

interface IProps {
  code: string;
  language: string;
}

const CodeBlock = ({ code, language }: IProps) => {
  useEffect(() => {
    Prism.highlightAll(false);
  }, []);
  return (
    <pre>
      <code children={code} className={`language-${language}`} />
    </pre>
  );
};

export default CodeBlock;