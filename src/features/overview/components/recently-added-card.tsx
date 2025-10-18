"use client";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent, CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

const getAllCount = (recentlyAddedData: {
  day: string;
  total: number;
}[]) => {
  return recentlyAddedData.reduce((acc, curr) => acc + curr.total, 0);
}


export function RecentlyAddedCard({ recentlyAddedData }: {
  recentlyAddedData: {
    day: string;
    total: number;
  }[]
}) {
  // const allCount = recentlyAddedData
  const router = useRouter();
  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>最近入库</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={recentlyAddedData}>
              <XAxis
                dataKey="day"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
              />
              <Bar dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm mt-4">
            <span className="font-bold text-lg">{getAllCount(recentlyAddedData) > 0 ? '最近一周入库了' + getAllCount(recentlyAddedData) + '部影片 😎' : '最近一周没有入库影片 😭'}</span> 
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => {
            router.push('/dashboard/file/scraper');
          }}>
            查看详情
          </Button>
        </CardFooter>
      </Card></>
  );
}