import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "false", label: "Active" },
  { value: "true", label: "Disabled" },
];

type UserFiltersProps = {
  searchQ: string;
  roleFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

export function UserFilters({
  searchQ,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Input
        placeholder="Search by username, email, or ID..."
        value={searchQ}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
