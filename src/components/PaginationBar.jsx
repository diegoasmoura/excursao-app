import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationBar({ page, pageCount, pageSize, total, from, to, onPage }) {
  if (total <= pageSize) return null;

  return (
    <div className="pager" role="navigation" aria-label="Paginação">
      <button
        type="button"
        className="btn btn-secondary pager__btn"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft size={18} aria-hidden />
        Anterior
      </button>
      <p className="pager__status">
        {from}–{to} de {total}
      </p>
      <button
        type="button"
        className="btn btn-secondary pager__btn"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Próxima
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
