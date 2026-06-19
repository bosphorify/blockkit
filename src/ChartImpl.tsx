import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart'
import { track as capture } from './track'

/**
 * The recharts-backed chart body. Heavy (recharts ~100kB gz), so it is ONLY
 * loaded lazily via the Chart wrapper in components.tsx — never import this
 * directly from anything that ships in the public bundle.
 */

const chartConfig = {
  value: { label: 'Value', color: 'var(--chart-1)' },
} satisfies ChartConfig

export default function ChartImpl({
  type = 'bar',
  values = [],
  label,
}: {
  type?: 'bar' | 'line' | 'area'
  values?: number[]
  label?: string
}) {
  React.useEffect(() => {
    capture('chart_viewed', { chart_type: type, points: values.length, label })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = values.map((v, i) => ({ name: String(i + 1), value: v }))
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="name"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={16}
      />
      <YAxis width={34} tickLine={false} axisLine={false} fontSize={11} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  )
  const chart =
    type === 'line' ? (
      <LineChart data={data}>
        {axes}
        <Line dataKey="value" stroke="var(--color-value)" dot={false} />
      </LineChart>
    ) : type === 'area' ? (
      <AreaChart data={data}>
        {axes}
        <Area
          dataKey="value"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.2}
        />
      </AreaChart>
    ) : (
      <RBarChart data={data}>
        {axes}
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </RBarChart>
    )

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      {chart}
    </ChartContainer>
  )
}
