import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface PaginationProps {
  pagination: PaginationInfo;
  updateFilters: (newFilters: { [key: string]: string | number }) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  updateFilters
}) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{pagination.page}</span> of <span className="font-medium text-foreground">{pagination.totalPages}</span> pages
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => updateFilters({ page: pagination.page - 1 })}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Prev
        </button>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => updateFilters({ page: pagination.page + 1 })}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1"
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
export default Pagination;
