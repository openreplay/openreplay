import React, { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Button, Tooltip } from 'antd';
import { Copy, Check } from 'lucide-react';

interface Props {
  content: string;
  getHtml?: () => any;
  variant?: 'text' | 'primary' | 'ghost' | 'link' | 'default';
  className?: string;
  btnText?: string;
  size?: 'small' | 'middle' | 'large';
  isIcon?: boolean;
  format?: string;
}

function CopyButton({
  content,
  getHtml,
  variant = 'text',
  className = 'capitalize mt-2 font-medium text-neutral-400',
  btnText = 'copy',
  size = 'small',
  isIcon = false,
  format = 'text/plain',
}: Props) {
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  const copyHandler = () => {
    setCopied(true);

    const raw = (getHtml?.() ?? content ?? '') as string;

    const htmlToText = (html: string) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.innerText;
    };

    const isSecure =
      window.isSecureContext &&
      !!navigator.clipboard &&
      typeof (window as any).ClipboardItem !== 'undefined';
    if (!isSecure) {
      copy(content);
      reset();
      return;
    }

    try {
      const items: Record<string, Blob> = {};
      if (format === 'text/html') {
        const plain = htmlToText(raw);
        items['text/html'] = new Blob([raw], { type: 'text/html' });
        items['text/plain'] = new Blob([plain], { type: 'text/plain' });
      } else {
        items[format] = new Blob([raw], { type: format });
        if (format !== 'text/plain') {
          items['text/plain'] = new Blob([raw], { type: 'text/plain' });
        }
      }

      const cbItem = new (window as any).ClipboardItem(items);

      navigator.clipboard
        .write([cbItem])
        .catch((e) => {
          console.error('Failed to copy:', e);
          const plain = format === 'text/html' ? htmlToText(raw) : raw;
          return navigator.clipboard.writeText(plain).catch(() => copy(plain));
        })
        .finally(() => {
          reset();
        });
    } catch (e) {
      console.error('Failed to copy:', e);
      const plain = format === 'text/html' ? htmlToText(raw) : raw;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(plain)
          .catch(() => copy(plain))
          .finally(reset);
      } else {
        copy(plain);
        reset();
      }
    }
  };

  if (isIcon) {
    return (
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <Button
          type="text"
          onClick={copyHandler}
          size={size}
          icon={
            copied ? (
              <Check strokeWidth={2} size={16} />
            ) : (
              <Copy strokeWidth={2} size={16} />
            )
          }
        />
      </Tooltip>
    );
  }
  return (
    <Button
      type={variant}
      onClick={copyHandler}
      size={size}
      className={className}
    >
      {copied ? 'copied' : btnText}
    </Button>
  );
}

export default CopyButton;
