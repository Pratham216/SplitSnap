import { QRCodeSVG } from "qrcode.react";

export default function QRDisplay({
  url,
  size = 180,
}: {
  url: string;
  size?: number;
}) {
  return (
    <div className="bg-white p-3 rounded-xl inline-block">
      <QRCodeSVG value={url} size={size} level="M" />
    </div>
  );
}
