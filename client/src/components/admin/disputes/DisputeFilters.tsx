import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const disputeStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "resolved_valid", label: "Valid Dispute" },
  { value: "resolved_rejected", label: "Rejected" },
];

type DisputeFiltersProps = {
  disputeStatusFilter: string;
  sellerSearch: string;
  onStatusChange: (value: string) => void;
  onSellerSearchChange: (value: string) => void;
};

export function DisputeFilters({
  disputeStatusFilter,
  sellerSearch,
  onStatusChange,
  onSellerSearchChange,
}: DisputeFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Select value={disputeStatusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {disputeStatusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Filter by seller ID..."
        value={sellerSearch}
        onChange={(e) => onSellerSearchChange(e.target.value)}
        className="md:w-56"
      />
    </div>
  );
}
