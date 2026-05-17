import { useState, useMemo, Fragment } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ModelBreakdownRow } from "./ModelBreakdownRow"
import { formatTokens, formatCost, formatDate } from "@/lib/format"
import type {
  DailyEntry,
  MonthlyEntry,
  ModelBreakdown,
  ViewMode,
} from "@/lib/types"
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react"

type RowData =
  | (DailyEntry & { _type: "daily" })
  | (MonthlyEntry & { _type: "monthly" })

interface DataTableProps {
  mode: ViewMode
  data: RowData[]
  loading: boolean
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ChevronUp className="ml-1 inline h-4 w-4" />
  if (sorted === "desc") return <ChevronDown className="ml-1 inline h-4 w-4" />
  return <ChevronsUpDown className="ml-1 inline h-4 w-4 opacity-40" />
}

export function DataTable({ mode, data, loading }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const isDailyLike = mode === "daily" || mode === "custom" || mode === "alltime"

  const columns = useMemo<ColumnDef<RowData, unknown>[]>(() => {
    const cols: ColumnDef<RowData, unknown>[] = []

    if (isDailyLike) {
      cols.push({
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => formatDate(getValue() as string),
      })
    } else {
      cols.push({
        accessorKey: "month",
        header: "Month",
      })
    }

    cols.push(
      {
        accessorKey: "totalTokens",
        header: "Total Tokens",
        cell: ({ getValue }) => formatTokens(getValue() as number),
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        cell: ({ getValue }) => formatCost(getValue() as number),
      },
    )

    return cols
  }, [isDailyLike])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const totalCols = columns.length + 1 // +1 for expand column

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {mode === "alltime" ? "All Time" : mode === "custom" ? "Custom Range" : mode.charAt(0).toUpperCase() + mode.slice(1)} Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  <TableHead className="w-10" />
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort() && (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const original = row.original
                  const hasBreakdowns =
                    "modelBreakdowns" in original &&
                    (original as { modelBreakdowns?: ModelBreakdown[] })
                      .modelBreakdowns?.length > 0
                  const isExpanded = expanded[row.id]

                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className={
                          hasBreakdowns
                            ? "cursor-pointer hover:bg-muted/50"
                            : ""
                        }
                        onClick={() => {
                          if (hasBreakdowns) {
                            setExpanded((prev) => ({
                              ...prev,
                              [row.id]: !prev[row.id],
                            }))
                          }
                        }}
                      >
                        {hasBreakdowns && (
                          <TableCell className="w-10 text-center">
                            {hasBreakdowns &&
                              (isExpanded ? (
                                <ChevronDown className="inline h-4 w-4" />
                              ) : (
                                <ChevronRight className="inline h-4 w-4" />
                              ))}
                          </TableCell>
                        )}
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && hasBreakdowns && (
                        <ModelBreakdownRow
                          breakdowns={
                            (original as { modelBreakdowns: ModelBreakdown[] })
                              .modelBreakdowns
                          }
                          colSpan={totalCols}
                        />
                      )}
                    </Fragment>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalCols}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
