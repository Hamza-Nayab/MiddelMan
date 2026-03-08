import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reviewStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "false", label: "Visible" },
  { value: "true", label: "Hidden" },
];

const ratingOptions = [
  { value: "all", label: "All Ratings" },
  { value: "1", label: "1 Star" },
  { value: "2", label: "2 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "5", label: "5 Stars" },
];

type ReviewFiltersProps = {
  reviewRatingFilter: string;
  reviewStatusFilter: string;
  sellerFilter: string;
  onRatingChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSellerChange: (value: string) => void;
};

export function ReviewFilters({
  reviewRatingFilter,
  reviewStatusFilter,
  sellerFilter,
  onRatingChange,
  onStatusChange,
  onSellerChange,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Select value={reviewRatingFilter} onValueChange={onRatingChange}>
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent>
          {ratingOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Seller ID"
        value={sellerFilter}
        onChange={(e) => onSellerChange(e.target.value)}
        className="md:w-40"
      />
      <Select value={reviewStatusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {reviewStatusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
