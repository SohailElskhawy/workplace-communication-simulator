import { Card, type CardProps } from "./card";

export type GlassCardProps = CardProps;

export function GlassCard(props: GlassCardProps) {
  return <Card {...props} />;
}
