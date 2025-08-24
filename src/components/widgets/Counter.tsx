"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { WidgetSetting } from "@/lib/widgetRegistry";
import { AdditionalHooks } from "../WidgetDisplay";
import { Counter as CounterType } from "@prisma/client";

export interface CounterProps {
  counters: CounterType[];
  additionalHooks: AdditionalHooks;
  settings: WidgetSetting[];
}

const Counter: React.FC<CounterProps> = ({
  counters,
  additionalHooks,
  settings,
}) => {
  const [selectedCounter, setSelectedCounter] = useState<
    CounterType | undefined
  >(undefined);
  const dataSourceValue = settings.find((s) => s.key === "dataSource")?.value;
  const [needsDataSource, setNeedsDataSource] = useState(
    counters ? counters.length == 0 : true
  );
  const updateCounter = additionalHooks?.updateCounter;
  const [optimisticValue, setOptimisticValue] = useState<number | null>(null);

  useEffect(() => {
    if (!dataSourceValue || !counters || counters.length == 0) {
      setNeedsDataSource(true);
      return;
    }
    setSelectedCounter(counters.find((c) => c.id == dataSourceValue));
  }, [dataSourceValue, counters, selectedCounter]);

  // Initialize or reconcile optimistic value from selected counter
  useEffect(() => {
    if (selectedCounter) {
      // Initialize on first load
      if (optimisticValue == null) {
        setOptimisticValue(selectedCounter.value);
      }
      // Update from server only when no pending operations and values differ
      // This allows external changes while preserving local optimistic updates
      else if (!updateCounter.isPending && selectedCounter.value !== optimisticValue) {
        setOptimisticValue(selectedCounter.value);
      }
    }
  }, [selectedCounter?.value, optimisticValue, updateCounter.isPending]);

  const handleIncrement = (n: number = 1) => {
    if (!selectedCounter) return;
    const current = optimisticValue ?? selectedCounter.value;
    const newValue = current + n;
    setOptimisticValue(newValue);
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const handleDecrement = (n: number = 1) => {
    if (!selectedCounter) return;
    const current = optimisticValue ?? selectedCounter.value;
    const newValue = current - n;
    setOptimisticValue(newValue);
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const handleReset = () => {
    if (!selectedCounter) return;
    const newValue = 0;
    setOptimisticValue(newValue);
    updateCounter.mutate({ id: selectedCounter.id, value: newValue });
  };

  const cardName = useMemo(() => {
    return (
      settings.find((setting) => setting.key === "cardName")?.value ??
      "New Card"
    );
  }, [settings]);

  useEffect(() => {
    if (!counters || !counters.length) {
      setNeedsDataSource(true);
    }
  }, [counters]);

  return (
    <div className="w-full mx-2 bg-transparent">
      <CardHeader className="flex items-center text-xl">
        {cardName ?? "Counter"}
      </CardHeader>
      <CardContent className="flex items-center justify-around my-6 gap-2 p-0">
        {!needsDataSource ? (
          <>
            <div className="flex flex-col gap-2 *:w-16 *:h-16 *:text-2xl *:border-gray-600">
              <Button
                variant="outline"
                size={"lg"}
                className=""
                onClick={() => handleDecrement(1)}
              >
                -1
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleDecrement(5)}
              >
                -5
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleDecrement(10)}
              >
                -10
              </Button>
            </div>
            <span className="text-8xl font-semibold">
              {optimisticValue ?? selectedCounter?.value}
            </span>
            <div className="flex flex-col gap-4 *:w-16 *:h-16 *:text-2xl *:border-gray-600">
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(1)}
              >
                +1
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(5)}
              >
                +5
              </Button>
              <Button
                variant="outline"
                size={"lg"}
                onClick={() => handleIncrement(10)}
              >
                +10
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center items-center text-center w-full">
            <p className="font-bold">Needs Counter Data Source</p>
            <p>(Select in Settings)</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          variant="ghost"
          disabled={needsDataSource}
          onClick={handleReset}
        >
          <RefreshCw size={32} className="mr-2" />
          Reset
        </Button>
      </CardFooter>
    </div>
  );
};

export default Counter;
