import React from "react";
import {
  useDataSource,
  DataSourceHook,
  DataSourceItem,
} from "@/hooks/useDataSource";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  source: string;
  userId: number;
  value: string;
  onChange: (v: string) => void;
  onManage: () => void;
}

export const DropdownDataSource: React.FC<Props> = ({
  source,
  userId,
  value,
  onChange,
  onManage,
}) => {
  const { items, isLoading }: DataSourceHook = useDataSource(source, userId);

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  return (
    <div className="flex gap-2 items-center">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={source} className="flex-1">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {items.map((i: DataSourceItem) => (
            <SelectItem key={i.id} value={i.id.toString()}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={onManage}>
        Manage
      </Button>
    </div>
  );
};
