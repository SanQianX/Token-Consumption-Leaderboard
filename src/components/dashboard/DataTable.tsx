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
  SessionEntry,
  BlockEntry,
  ModelBreakdown,
} from "@/lib/types"
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react"

type RowData =
  | (DailyEntry & { _type: "daily" })
  | (MonthlyEntry & { _type: "monthly" })
  | (SessionEntry & { _type: "session" })
  | (BlockEntry & { _type: "blocks" })

interface DataTableProps {
  mode: "daily" | "monthly" | "session" | "blocks"
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

  const colCount = mode === "blocks" ? 0 : 1

  const columns = useMemo<ColumnDef<RowData, unknown>[]>(() => {
    const cols: ColumnDef<RowData, unknown>[] = []

    if (mode === "daily") {
      cols.push({
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => formatDate(getValue() as string),
      })
    } else if (mode === "monthly") {
      cols.push({
        accessorKey: "month",
        header: "Month",
      })
    } else if (mode === "session") {
      cols.push({
        accessorKey: "sessionId",
        header: "Session ID",
        cell: ({ getValue }) => {
          const id = getValue() as string
          return <span className="font-mono text-xs">{id.slice(0, 8)}...</span>
        },
      })
    } else {
      cols.push({
        accessorKey: "startTime",
        header: "Start Time",
        cell: ({ getValue }) => formatDate(getValue() as string),
      })
    }

    cols.push(
      {
        accessorKey: "totalTokens",
        header: "Total Tokens",
        cell: ({ getValue }) => formatTokens(getValue() as number),
      },
      {
        accessorKey: mode === "blocks" ? "costUSD" : "totalCost",
        header: "Cost",
        cell: ({ getValue }) => formatCost(getValue() as number),
      },
    )

    if (mode === "session") {
      cols.push({
        accessorKey: "projectPath",
        header: "Project",
        cell: ({ getValue }) => {
          const path = getValue() as string
          const name = path.split("/").pop() || path.split("\\").pop() || path
          return <span className="font-mono text-xs">{name}</span>
        },
      })
    }

    if (mode === "blocks") {
      cols.push(
        {
          accessorKey: "entries",
          header: "Entries",
        },
        {
          accessorKey: "isActive",
          header: "Active",
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="inline-block rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                Active
              </span>
            ) : null,
        },
      )
    }

    return cols
  }, [mode])

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

  const totalCols = columns.length + colCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {mode.charAt(0).toUpperCase() + mode.slice(1)} Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {colCount > 0 && <TableHead className="w-10" />}
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
                    mode !== "blocks" &&
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
                        {colCount > 0 && (
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
