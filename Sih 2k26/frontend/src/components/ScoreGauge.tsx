import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface Props {
  score: number;
  size?: number;
}

function colour(score: number) {
  if (score >= 82) return "#02C39A";
  if (score >= 62) return "#D97706";
  return "#E11D48";
}

export function ScoreGauge({ score, size = 180 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const data = [
    { name: "score", value: clamped },
    { name: "rest", value: 100 - clamped },
  ];
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`Compliance score ${clamped} out of 100`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={210}
            endAngle={-30}
            innerRadius="68%"
            outerRadius="90%"
            stroke="none"
          >
            <Cell fill={colour(clamped)} />
            <Cell fill="#E8EAF3" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="font-serif text-3xl font-bold text-navy">{clamped.toFixed(0)}</span>
        <span className="text-xs uppercase tracking-wider text-slate-500">/ 100</span>
      </div>
    </div>
  );
}
