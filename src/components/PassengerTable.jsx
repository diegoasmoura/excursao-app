import { useEffect, useMemo } from 'react';
import { Pencil, UserCheck, UserMinus, UserX } from 'lucide-react';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { formatPassengerPhone } from '../lib/passengerDisplay';
import DocumentCell from './DocumentCell';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const helper = createColumnHelper();
const ICON_COLUMNS = new Set(['edit', 'remove']);

function sortIndicator(column) {
  const sorted = column.getIsSorted();
  return (
    <span className={`grid-table__sort ${sorted ? 'is-on' : ''}`} aria-hidden>
      {sorted === 'desc' ? '▼' : '▲'}
    </span>
  );
}

export default function PassengerTable({
  passengers,
  orderSource,
  onTogglePaid,
  onToggleGoing,
  onRemove,
  onEdit,
  highlightPersonId,
}) {
  // `order` guarda a posição real (para ordenar). `shown` numera só quem vai viajar.
  const { order, shown } = useMemo(() => {
    const source = orderSource ?? passengers;
    const orderMap = {};
    const shownMap = {};
    let going = 0;
    source.forEach((seat, index) => {
      orderMap[seat.id] = index + 1;
      if (!seat.is_cancelled) {
        going += 1;
        shownMap[seat.id] = going;
      }
    });
    return { order: orderMap, shown: shownMap };
  }, [orderSource, passengers]);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor((row) => order[row.id] ?? 0, {
          id: 'number',
          header: 'N.',
          cell: (info) => shown[info.row.original.id] ?? '—',
        }),
        helper.accessor('name', {
          header: 'Nome',
          cell: (info) => info.getValue() || '—',
        }),
        helper.accessor((row) => (row.is_cancelled ? 'Não vai' : 'Vai'), {
          id: 'going',
          header: 'Vai?',
          enableSorting: false,
          cell: (info) => {
            const seat = info.row.original;
            return (
              <button
                type="button"
                className={`going-toggle going-toggle--${seat.is_cancelled ? 'dropped' : 'going'}`}
                title={
                  seat.is_cancelled
                    ? `${seat.name} não vai. Toque para colocar de volta.`
                    : `Toque se ${seat.name} não for mais viajar.`
                }
                onClick={() => onToggleGoing(seat)}
              >
                {seat.is_cancelled ? <UserX size={14} aria-hidden /> : <UserCheck size={14} aria-hidden />}
                {seat.is_cancelled ? 'Não vai' : 'Vai'}
              </button>
            );
          },
        }),
        helper.accessor((row) => row.doc_type || '', {
          id: 'docType',
          header: 'Tipo',
          enableSorting: false,
          cell: (info) => (
            <DocumentCell rg={info.row.original.rg} docType={info.row.original.doc_type} part="type" />
          ),
        }),
        helper.accessor((row) => row.rg || '', {
          id: 'document',
          header: 'Número',
          enableSorting: false,
          cell: (info) => (
            <DocumentCell rg={info.row.original.rg} docType={info.row.original.doc_type} part="number" />
          ),
        }),
        helper.accessor((row) => row.reference_point || '', {
          id: 'reference',
          header: 'Ref.',
          enableSorting: false,
          cell: (info) => info.getValue() || '—',
        }),
        helper.accessor((row) => formatPassengerPhone(row.phone), {
          id: 'phone',
          header: 'Telefone',
          enableSorting: false,
        }),
        helper.accessor((row) => (row.is_paid ? 'Pago' : 'Pendente'), {
          id: 'payment',
          header: 'Pagamento',
          enableSorting: false,
          cell: (info) => {
            const seat = info.row.original;
            return (
              <button
                type="button"
                className={[
                  'payment-toggle',
                  `payment-toggle--${seat.is_paid ? 'paid' : 'pending'}`,
                  seat.is_cancelled ? 'payment-toggle--off' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={seat.is_cancelled ? 'Não entra na conta enquanto estiver marcado como não vai.' : undefined}
                onClick={() => onTogglePaid(seat)}
              >
                {seat.is_paid ? 'Pago' : 'Pendente'}
              </button>
            );
          },
        }),
        helper.display({
          id: 'edit',
          header: 'Editar',
          enableSorting: false,
          cell: (info) => (
            <button
              type="button"
              className="icon-action"
              title="Editar"
              aria-label="Editar"
              onClick={() => onEdit(info.row.original)}
            >
              <Pencil size={16} />
            </button>
          ),
        }),
        helper.display({
          id: 'remove',
          header: 'Tirar',
          enableSorting: false,
          cell: (info) => (
            <button
              type="button"
              className="icon-action icon-action--danger"
              title="Tirar"
              aria-label="Tirar"
              onClick={() => onRemove(info.row.original)}
            >
              <UserMinus size={16} />
            </button>
          ),
        }),
      ]),
    [order, shown, onTogglePaid, onToggleGoing, onRemove, onEdit],
  );

  useEffect(() => {
    if (!highlightPersonId) return;
    document.querySelector(`[data-person-id="${highlightPersonId}"]`)?.scrollIntoView({ block: 'center' });
  }, [highlightPersonId, passengers]);

  const table = useTable({
    features,
    columns,
    data: passengers,
    getRowId: (row) => row.id,
  });

  return (
    <div className="grid-table-wrap">
      <table className="grid-table passengers-table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort?.();
                return (
                  <th
                    key={header.id}
                    className={[
                      canSort ? 'is-sortable' : '',
                      ICON_COLUMNS.has(header.column.id) ? 'grid-table__icon' : '',
                      header.column.id === 'number' ? 'passengers-table__number' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    {canSort ? sortIndicator(header.column) : null}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="grid-table__empty">
                Nenhuma pessoa corresponde à busca.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => {
              const seat = row.original;
              const rowClass = [
                seat.is_cancelled ? 'is-cancelled' : '',
                seat.person_id === highlightPersonId ? 'is-highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <tr key={row.id} data-person-id={seat.person_id} className={rowClass || undefined}>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={
                        cell.column.id === 'payment'
                          ? 'payment-cell'
                          : cell.column.id === 'going'
                            ? 'going-cell'
                            : ICON_COLUMNS.has(cell.column.id)
                              ? 'grid-table__icon'
                              : cell.column.id === 'number'
                                ? 'passengers-table__number'
                                : cell.column.id === 'name'
                                  ? 'name-cell'
                                  : undefined
                      }
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
