"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Maximize2, X } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function QrPanel({ url }: { url: string }) {
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#0b1222", light: "#ffffff" },
    }).then(setSvg);
  }, [url]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function downloadPng() {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 1600,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1222", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "audience-survey-qr.png";
    a.click();
  }

  return (
    <>
      <Card className="mt-6 grid gap-6 p-6 md:grid-cols-[260px_1fr]">
        <div
          className="aspect-square w-full max-w-[260px] rounded-md bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-label="QR code for the survey"
          role="img"
        />
        <div className="flex flex-col justify-center gap-3">
          <p className="text-xs text-ink-mute">Survey link</p>
          <p className="break-all rounded-md border border-line bg-sunken px-3 py-2 font-medium text-ink">{url}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPng}>
              <Download size={14} />
              Download PNG
            </Button>
            <Button size="sm" onClick={() => setFull(true)}>
              <Maximize2 size={14} />
              Full screen
            </Button>
          </div>
          <p className="text-xs text-ink-mute">
            Set <code>NEXT_PUBLIC_SITE_URL</code> in production so the code points at the deployed domain.
          </p>
        </div>
      </Card>

      {full && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05080f] p-8">
          <button
            onClick={() => setFull(false)}
            className="absolute right-6 top-6 rounded-md p-2 text-ink-mute hover:bg-raised hover:text-ink"
            aria-label="Exit full screen"
          >
            <X size={22} />
          </button>
          <p className="mb-8 text-center text-3xl font-bold tracking-tight text-ink md:text-5xl">
            Scan to join the audience profile
          </p>
          <div
            className="aspect-square w-[min(70vh,80vw)] rounded-xl bg-white p-6 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
            role="img"
            aria-label="QR code for the survey"
          />
          <p className="mt-8 text-xl text-ink-soft md:text-2xl">{url.replace(/^https?:\/\//, "")}</p>
        </div>
      )}
    </>
  );
}
