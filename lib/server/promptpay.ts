import QRCode from "qrcode";

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function formatId(id: string): string {
  const digits = onlyDigits(id);
  if (digits.length === 10 && digits.startsWith("0")) {
    return `0066${digits.slice(1)}`;
  }
  if (digits.length === 13) {
    return digits;
  }
  return digits;
}

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function promptPayPayload(account: string, amount: number): string {
  const target = formatId(account);
  const merchantInfo = emv("00", "A000000677010111") + emv("01", target);
  const amountValue = Number(amount).toFixed(2);

  const body =
    emv("00", "01") +
    emv("01", "11") +
    emv("29", merchantInfo) +
    emv("58", "TH") +
    emv("53", "764") +
    emv("54", amountValue) +
    emv("62", emv("07", "LINESTICK")) +
    "6304";

  return body + crc16(body);
}

export async function promptPayQrDataUrl(account: string, amount: number): Promise<string> {
  const payload = promptPayPayload(account, amount);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
