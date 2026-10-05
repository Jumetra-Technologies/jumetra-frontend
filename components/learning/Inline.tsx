import Link from "next/link";
import { isExternalHref, parseInline } from "@/lib/learning/inline";

/** Renders content strings that use the `code`, **bold**, and [label](href) markers. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.kind) {
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-muted-bg px-1.5 py-0.5 text-[0.85em] text-foreground"
              >
                {token.text}
              </code>
            );
          case "bold":
            return (
              <strong key={index} className="font-semibold text-foreground">
                {token.text}
              </strong>
            );
          case "link":
            return isExternalHref(token.href) ? (
              <a
                key={index}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {token.text}
              </a>
            ) : (
              <Link
                key={index}
                href={token.href}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {token.text}
              </Link>
            );
          default:
            return <span key={index}>{token.text}</span>;
        }
      })}
    </>
  );
}
