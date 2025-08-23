// src/components/ui/date-range-picker.tsx
import * as React from "react"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          {value?.from ? `${format(value.from, "PPP")} – ${value?.to ? format(value.to, "PPP") : ""}` : "Pick a date range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
