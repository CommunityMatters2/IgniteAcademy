import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type IgniteEmailProps = {
  preview: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  footnote?: string;
  accent?: "green" | "gold";
  appUrl: string;
};

/** Single branded layout used for every IGNITE email. */
export function IgniteEmail({
  preview,
  heading,
  paragraphs,
  cta,
  footnote,
  accent = "green",
  appUrl,
}: IgniteEmailProps) {
  const accentColor = accent === "gold" ? "#FDDD5A" : "#02BE62";
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#0A0A0B", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", backgroundColor: "#141416", borderRadius: 20, overflow: "hidden", border: "1px solid #26262b" }}>
          <Section style={{ height: 6, backgroundColor: accentColor }} />
          <Section style={{ padding: "28px 28px 8px" }}>
            <Img src={`${appUrl}/icon-192.png`} width="48" height="48" alt="IGNITE Academy" style={{ borderRadius: 999 }} />
            <Heading as="h1" style={{ color: "#F5F5F4", fontSize: 24, lineHeight: "30px", margin: "20px 0 8px", letterSpacing: -0.4 }}>
              {heading}
            </Heading>
            {paragraphs.map((p, i) => (
              <Text key={i} style={{ color: "#B4B4BB", fontSize: 15, lineHeight: "24px", margin: "0 0 12px" }}>
                {p}
              </Text>
            ))}
            {cta && (
              <Button
                href={cta.href}
                style={{
                  backgroundColor: accentColor,
                  color: "#0A0A0B",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 22px",
                  borderRadius: 999,
                  display: "inline-block",
                  margin: "8px 0 16px",
                }}
              >
                {cta.label}
              </Button>
            )}
            {footnote && <Text style={{ color: "#76767f", fontSize: 12, lineHeight: "18px" }}>{footnote}</Text>}
          </Section>
          <Hr style={{ borderColor: "#26262b", margin: 0 }} />
          <Section style={{ padding: "16px 28px 24px" }}>
            <Text style={{ color: "#76767f", fontSize: 12, margin: 0 }}>
              IGNITE Academy · a Community Matters 2 program
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default IgniteEmail;
