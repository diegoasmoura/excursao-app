import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Bus, CalendarDays, CalendarPlus, Download, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import AppShell from './components/AppShell';
import CreateWeekDialog from './components/CreateWeekDialog';
import LoginScreen from './components/LoginScreen';
import PaginationBar from './components/PaginationBar';
import PdfColumnsDialog from './components/PdfColumnsDialog';
import PeopleScreen from './components/PeopleScreen';
import ReferencesScreen from './components/ReferencesScreen';
import WhatsappDialog from './components/WhatsappDialog';
import WhatsappIcon from './components/WhatsappIcon';
import OccupancyMeter from './components/OccupancyMeter';
import { placeCellClass } from './components/PlaceChip';
import SortableTh, { compareNumber, compareText, nextSort } from './components/SortableTh';
import TripDetails from './components/TripDetails';
import { useConfirm } from './context/ConfirmContext';
import { useLayout } from './context/LayoutContext';
import { useFitPageSize } from './hooks/useFitPageSize';
import { usePagedItems } from './hooks/usePagedItems';
import { api } from './lib/api';
import { clearAuth, getStoredAuth } from './lib/auth';
import { displayPlace, formatTripDate, formatWeekdayShort, isUpcomingTrip, weekdayFromISO } from './lib/format';
import { isEmptyNotes, notesPreview } from './lib/richText';
import { downloadTripPdf, tripWhatsappUrl } from './lib/tripPdf';

function tripCounts(trip) {
  const passengerCount = Number(trip.passenger_count ?? trip.passengers?.[0]?.count ?? 0);
  const paidCount = Number(trip.paid_count ?? 0);
  const droppedCount = Number(trip.dropped_count ?? 0);
  return {
    passengerCount,
    paidCount,
    droppedCount,
    pendingCount: Math.max(0, passengerCount - paidCount),
  };
}

function hasNotes(trip) {
  return !isEmptyNotes(trip.notes);
}

/** Frase curta para a confirmação, para o pai saber o que está em jogo. */
function tripPeopleSentence(trip) {
  const { passengerCount, paidCount, droppedCount } = tripCounts(trip);
  if (passengerCount === 0 && droppedCount === 0) return 'Ninguém está nesta viagem.';
  const parts = [`${passengerCount} ${passengerCount === 1 ? 'pessoa vai' : 'pessoas vão'}`];
  if (paidCount > 0) parts.push(`${paidCount} ${paidCount === 1 ? 'paga' : 'pagas'}`);
  if (droppedCount > 0) parts.push(`${droppedCount} ${droppedCount === 1 ? 'não vai' : 'não vão'}`);
  return `Tem ${parts.join(', ')}.`;
}

function isCancelledTrip(trip) {
  return trip.status === 'cancelled';
}

function tripLabel(trip) {
  return `${formatTripDate(trip.trip_date)} · ${displayPlace(trip.origin)} → ${displayPlace(trip.destination)}`;
}

function restoreDestinationLabel(trip) {
  return isUpcomingTrip(trip.trip_date) ? 'Próximas' : 'Realizadas';
}

function App() {
  const confirm = useConfirm();
  const layout = useLayout();
  const [session, setSession] = useState(() => getStoredAuth());
  const [authReady, setAuthReady] = useState(!getStoredAuth());
  const [screen, setScreen] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [period, setPeriod] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [sort, setSort] = useState({ key: 'date', dir: 'asc' });
  const [highlightPersonId, setHighlightPersonId] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [pdfTrip, setPdfTrip] = useState(null);
  const [tripsArea, setTripsArea] = useState(null);
  const tripPageSize = useFitPageSize(tripsArea);
  const cancelledPeriod = period === 'cancelled';

  const leaveSession = () => {
    clearAuth();
    setSession(null);
    setTrips([]);
    setSelectedTrip(null);
    setScreen('trips');
  };

  const fetchTrips = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    const { data, error: fetchError } = await api.getTrips();
    if (fetchError) {
      if (!silent) {
        setError(fetchError.message);
        setTrips([]);
      }
    } else {
      setTrips(data ?? []);
    }
    if (!silent) setLoading(false);
  };

  const syncTripCounts = useCallback((tripId, passengerCount, paidCount, droppedCount = 0) => {
    setTrips((current) => {
      const index = current.findIndex((trip) => trip.id === tripId);
      if (index < 0) return current;
      const trip = current[index];
      if (
        Number(trip.passenger_count) === passengerCount &&
        Number(trip.paid_count) === paidCount &&
        Number(trip.dropped_count ?? 0) === droppedCount
      ) {
        return current;
      }
      const next = [...current];
      next[index] = {
        ...trip,
        passenger_count: passengerCount,
        paid_count: paidCount,
        dropped_count: droppedCount,
      };
      return next;
    });
  }, []);

  const closeTrip = () => {
    setSelectedTrip(null);
    setHighlightPersonId(null);
    fetchTrips({ silent: true });
  };

  useEffect(() => {
    if (!session?.token) {
      setAuthReady(true);
      return undefined;
    }
    let cancelled = false;
    api.me().then(({ data, error: authError }) => {
      if (cancelled) return;
      if (authError?.status === 401) {
        leaveSession();
      } else if (data?.username) {
        setSession((current) => (current ? { ...current, username: data.username } : current));
      }
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => leaveSession();
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  useEffect(() => {
    if (!session?.token || !authReady) return;
    fetchTrips();
    api.getWhatsapp().then(({ data }) => {
      if (data?.phone) setWhatsapp(data.phone);
    });
  }, [session?.token, authReady]);

  const sendListedTrip = (event, trip) => {
    event.stopPropagation();
    if (!whatsapp) {
      setWhatsappOpen(true);
      return;
    }
    const url = tripWhatsappUrl(whatsapp, trip, { inBrowser: layout === 'desktop' });
    const chat = window.open(url, '_blank');
    if (!chat) {
      window.location.assign(url);
    }
  };

  const downloadListedTrip = (event, trip) => {
    event.stopPropagation();
    setPdfTrip(trip);
  };

  useEffect(() => {
    setSort({ key: 'date', dir: period === 'upcoming' ? 'asc' : 'desc' });
  }, [period]);

  const filteredTrips = useMemo(() => {
    const list = trips.filter((trip) => {
      if (period === 'cancelled') return isCancelledTrip(trip);
      if (isCancelledTrip(trip)) return false;
      return period === 'upcoming' ? isUpcomingTrip(trip.trip_date) : !isUpcomingTrip(trip.trip_date);
    });
    return [...list].sort((a, b) => {
      const countsA = tripCounts(a);
      const countsB = tripCounts(b);
      if (sort.key === 'weekday') return compareNumber(weekdayFromISO(a.trip_date), weekdayFromISO(b.trip_date), sort.dir);
      if (sort.key === 'origin') return compareText(displayPlace(a.origin), displayPlace(b.origin), sort.dir);
      if (sort.key === 'destination') return compareText(displayPlace(a.destination), displayPlace(b.destination), sort.dir);
      if (sort.key === 'occupancy') return compareNumber(countsA.passengerCount, countsB.passengerCount, sort.dir);
      if (sort.key === 'paid') return compareNumber(countsA.paidCount, countsB.paidCount, sort.dir);
      return compareText(a.trip_date, b.trip_date, sort.dir);
    });
  }, [trips, period, sort]);

  const pagedTrips = usePagedItems(filteredTrips, tripPageSize, `${period}|${sort.key}|${sort.dir}`);

  const handleNavigate = (next) => {
    const leavingTrip = Boolean(selectedTrip);
    setSelectedTrip(null);
    setHighlightPersonId(null);
    setScreen(next);
    if (next === 'trips' && leavingTrip) fetchTrips({ silent: true });
    if (next === 'trips' && !leavingTrip && screen === 'people') fetchTrips({ silent: true });
  };

  const openPersonTrip = async (tripId, personId) => {
    setHighlightPersonId(personId);
    setScreen('trips');
    const known = trips.find((item) => item.id === tripId);
    if (known) {
      setSelectedTrip(known);
      setPeriod(isCancelledTrip(known) ? 'cancelled' : isUpcomingTrip(known.trip_date) ? 'upcoming' : 'past');
      return;
    }
    const { data } = await api.getTrips();
    const found = (data ?? []).find((item) => item.id === tripId);
    if (data) setTrips(data);
    if (found) {
      setSelectedTrip(found);
      setPeriod(isCancelledTrip(found) ? 'cancelled' : isUpcomingTrip(found.trip_date) ? 'upcoming' : 'past');
    }
  };

  const handleWeekCreated = (created) => {
    setWeekDialogOpen(false);
    setError(null);
    setPeriod('upcoming');
    setTrips((current) => [...current, ...created].sort((a, b) => a.trip_date.localeCompare(b.trip_date)));
  };

  const openTrip = (trip) => setSelectedTrip(trip);

  const startEdit = (event, trip) => {
    event.stopPropagation();
    setEditingTrip(trip);
  };

  /** Devolve a viagem atualizada, ou null quando o pai desiste ou dá erro. */
  const cancelTrip = async (trip) => {
    const ok = await confirm({
      title: 'Cancelar viagem',
      message: `Cancelar a viagem ${tripLabel(trip)}? ${tripPeopleSentence(trip)} Ela vai para Canceladas. As pessoas continuam na lista e você pode voltar depois.`,
      confirmLabel: 'Cancelar viagem',
      cancelLabel: 'Não',
      danger: false,
    });
    if (!ok) return null;
    const { data, error: cancelError } = await api.cancelTrip(trip.id);
    if (cancelError) {
      setError(cancelError.message);
      return null;
    }
    setError(null);
    setTrips((current) => current.map((item) => (item.id === trip.id ? { ...item, ...data } : item)));
    setSelectedTrip((open) => (open?.id === trip.id ? { ...open, ...data } : open));
    return data;
  };

  const restoreTrip = async (trip) => {
    const destination = restoreDestinationLabel(trip);
    const ok = await confirm({
      title: 'Voltar viagem',
      message: `Voltar a viagem ${tripLabel(trip)} para ${destination}?`,
      confirmLabel: 'Voltar',
      cancelLabel: 'Não',
      danger: false,
    });
    if (!ok) return null;
    const { data, error: restoreError } = await api.restoreTrip(trip.id);
    if (restoreError) {
      setError(restoreError.message);
      return null;
    }
    setError(null);
    setTrips((current) => current.map((item) => (item.id === trip.id ? { ...item, ...data } : item)));
    setSelectedTrip((open) => (open?.id === trip.id ? { ...open, ...data } : open));
    setPeriod(isUpcomingTrip(trip.trip_date) ? 'upcoming' : 'past');
    return data;
  };

  /** Devolve true quando apagou de vez. */
  const deleteTripForever = async (trip) => {
    const ok = await confirm({
      title: 'Excluir de vez',
      message: `Apagar de vez a viagem ${tripLabel(trip)}? Não dá para desfazer. As pessoas continuam na lista geral.`,
      confirmLabel: 'Excluir de vez',
      cancelLabel: 'Não',
    });
    if (!ok) return false;
    const { error: deleteError } = await api.deleteTrip(trip.id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    setError(null);
    setTrips((current) => current.filter((item) => item.id !== trip.id));
    if (selectedTrip?.id === trip.id) closeTrip();
    return true;
  };

  const cancelListedTrip = (event, trip) => {
    event.stopPropagation();
    cancelTrip(trip);
  };

  const restoreListedTrip = (event, trip) => {
    event.stopPropagation();
    restoreTrip(trip);
  };

  const deleteListedTrip = (event, trip) => {
    event.stopPropagation();
    deleteTripForever(trip);
  };

  const activeTrips = trips.filter((trip) => !isCancelledTrip(trip));
  const upcomingCount = activeTrips.filter((trip) => isUpcomingTrip(trip.trip_date)).length;
  const pastCount = activeTrips.length - upcomingCount;
  const cancelledCount = trips.length - activeTrips.length;

  const emptyTitle =
    period === 'upcoming'
      ? 'Nenhuma viagem à frente'
      : period === 'past'
        ? 'Nenhuma viagem realizada'
        : 'Nenhuma viagem cancelada';

  const emptyMessage =
    period === 'cancelled'
      ? 'Quando cancelar uma viagem, ela aparece aqui. Dá para voltar ou excluir de vez.'
      : 'Use “Nova viagem” para criar a ida ou a volta.';

  const periodHint =
    period === 'upcoming'
      ? 'Quando a data da viagem passar, ela sai daqui e vai para Realizadas sozinha.'
      : period === 'past'
        ? 'Viagens com data já passada. Use Cancelar se essa viagem não aconteceu.'
        : 'Viagens canceladas. Use Voltar para desfazer ou Excluir de vez para apagar.';

  if (!authReady) {
    return <p className="login-checking">Carregando…</p>;
  }

  if (!session) {
    return <LoginScreen onLoggedIn={setSession} />;
  }

  const handleLogout = async () => {
    await api.logout();
    leaveSession();
  };

  return (
    <AppShell
      view={screen}
      settingsOpen={whatsappOpen}
      onNavigate={handleNavigate}
      onOpenSettings={() => setWhatsappOpen(true)}
      onLogout={handleLogout}
      mainClassName={selectedTrip ? 'main-content--detail' : ''}
    >
      {screen === 'people' && <PeopleScreen onOpenTrip={openPersonTrip} />}
      {screen === 'references' && <ReferencesScreen />}
      {screen === 'trips' && selectedTrip && (
        <TripDetails
          key={selectedTrip.id}
          trip={selectedTrip}
          highlightPersonId={highlightPersonId}
          alert={error}
          onBack={closeTrip}
          onPassengersChange={syncTripCounts}
          onCancelTrip={cancelTrip}
          onRestoreTrip={restoreTrip}
          onDeleteTrip={deleteTripForever}
        />
      )}
      {screen === 'trips' && !selectedTrip && (
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                <CalendarDays size={26} aria-hidden />
                Viagens
              </h1>
              <p>Crie uma viagem de cada vez: só a ida ou só a volta.</p>
            </div>
            <div className="page-header__actions">
              <button type="button" className="btn btn-primary" onClick={() => setWeekDialogOpen(true)}>
                <CalendarPlus size={18} color="#fff" aria-hidden />
                Nova viagem
              </button>
            </div>
          </div>

          <div className="period-tabs" role="tablist">
            <button type="button" className={period === 'upcoming' ? 'active' : ''} onClick={() => setPeriod('upcoming')}>
              <span className="period-tabs__label">Próximas</span>
              <span className="period-tabs__count">{upcomingCount}</span>
            </button>
            <button type="button" className={period === 'past' ? 'active' : ''} onClick={() => setPeriod('past')}>
              <span className="period-tabs__label">Realizadas</span>
              <span className="period-tabs__count">{pastCount}</span>
            </button>
            <button type="button" className={period === 'cancelled' ? 'active' : ''} onClick={() => setPeriod('cancelled')}>
              <span className="period-tabs__label">Canceladas</span>
              <span className="period-tabs__count">{cancelledCount}</span>
            </button>
          </div>
          <p className="page-hint">{periodHint}</p>

          {error && (
            <div className="feedback-warning">
              <strong>{error}</strong>
            </div>
          )}

          {loading ? (
            <p>Carregando viagens...</p>
          ) : filteredTrips.length === 0 ? (
            <div className="panel empty-state">
              <Bus size={48} className="text-primary" />
              <h3>{emptyTitle}</h3>
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className={`trips-table paged-table${cancelledPeriod ? ' trips-table--cancelled' : ''}`} ref={setTripsArea}>
                <div className="grid-table-wrap">
                  <table className="grid-table">
                    <colgroup>
                      <col className="col-date" />
                      <col className="col-weekday" />
                      <col className="col-place" />
                      <col className="col-place" />
                      <col className="col-occupancy" />
                      <col className="col-paid" />
                      <col className="col-icon" />
                      <col className="col-icon" />
                      <col className="col-icon" />
                      {cancelledPeriod ? (
                        <>
                          <col className="col-icon" />
                          <col className="col-icon" />
                        </>
                      ) : (
                        <col className="col-icon" />
                      )}
                    </colgroup>
                    <thead>
                      <tr>
                        <SortableTh column="date" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Data
                        </SortableTh>
                        <SortableTh column="weekday" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Dia
                        </SortableTh>
                        <SortableTh column="origin" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Origem
                        </SortableTh>
                        <SortableTh column="destination" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Destino
                        </SortableTh>
                        <SortableTh column="occupancy" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Lotação
                        </SortableTh>
                        <SortableTh column="paid" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Pagos
                        </SortableTh>
                        <th>Baixar</th>
                        <th>Abrir</th>
                        <th>Alterar</th>
                        {cancelledPeriod ? (
                          <>
                            <th>Voltar</th>
                            <th>Excluir</th>
                          </>
                        ) : (
                          <th>Cancelar</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTrips.slice.map((trip) => {
                        const { passengerCount, paidCount } = tripCounts(trip);
                        const anotada = hasNotes(trip);
                        const rowClass = [
                          'is-clickable',
                          cancelledPeriod ? 'is-cancelled' : '',
                          anotada ? 'has-notes' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <tr
                            key={trip.id}
                            className={rowClass}
                            onClick={() => openTrip(trip)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') openTrip(trip);
                            }}
                            tabIndex={0}
                          >
                            <td
                              className="trips-table__date"
                              title={anotada ? `Tem anotações: ${notesPreview(trip.notes)}` : undefined}
                            >
                              <span className="trips-table__date-text">{formatTripDate(trip.trip_date)}</span>
                              {cancelledPeriod && <span className="chip-cancelled">Cancelada</span>}
                            </td>
                            <td className="trips-table__weekday">{formatWeekdayShort(trip.trip_date)}</td>
                            <td className={placeCellClass(trip.origin)}>{displayPlace(trip.origin)}</td>
                            <td className={placeCellClass(trip.destination)}>{displayPlace(trip.destination)}</td>
                            <td>
                              <OccupancyMeter count={passengerCount} capacity={trip.capacity} />
                            </td>
                            <td>{paidCount}</td>
                            <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="icon-action" title="Baixar lista" aria-label="Baixar lista" onClick={(event) => downloadListedTrip(event, trip)}>
                                <Download size={16} />
                              </button>
                            </td>
                            <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="icon-action" title="Abrir WhatsApp" aria-label="Abrir WhatsApp" onClick={(event) => sendListedTrip(event, trip)}>
                                <WhatsappIcon />
                              </button>
                            </td>
                            <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="icon-action" title="Alterar" aria-label="Alterar" onClick={(event) => startEdit(event, trip)}>
                                <Pencil size={16} />
                              </button>
                            </td>
                            {cancelledPeriod ? (
                              <>
                                <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                                  <button type="button" className="icon-action" title="Voltar" aria-label="Voltar" onClick={(event) => restoreListedTrip(event, trip)}>
                                    <RotateCcw size={16} />
                                  </button>
                                </td>
                                <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                                  <button type="button" className="icon-action icon-action--danger" title="Excluir de vez" aria-label="Excluir de vez" onClick={(event) => deleteListedTrip(event, trip)}>
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                                <button type="button" className="icon-action icon-action--warn" title="Cancelar" aria-label="Cancelar" onClick={(event) => cancelListedTrip(event, trip)}>
                                  <Ban size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  page={pagedTrips.page}
                  pageCount={pagedTrips.pageCount}
                  pageSize={pagedTrips.pageSize}
                  total={pagedTrips.total}
                  from={pagedTrips.from}
                  to={pagedTrips.to}
                  onPage={pagedTrips.setPage}
                />
              </div>
          )}
        </div>
      )}
      {weekDialogOpen && (
        <CreateWeekDialog onClose={() => setWeekDialogOpen(false)} onCreated={handleWeekCreated} />
      )}
      {pdfTrip && (
        <PdfColumnsDialog
          onClose={() => setPdfTrip(null)}
          onConfirm={async (columns) => {
            await downloadTripPdf(pdfTrip, columns);
          }}
        />
      )}
      {whatsappOpen && (
        <WhatsappDialog
          initialPhone={whatsapp}
          onClose={() => setWhatsappOpen(false)}
          onSaved={(phone) => {
            setWhatsapp(phone);
            setWhatsappOpen(false);
          }}
        />
      )}
      {editingTrip && (
        <CreateWeekDialog
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onUpdated={(updated) => {
            setEditingTrip(null);
            setTrips((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
          }}
        />
      )}
    </AppShell>
  );
}

export default App;
