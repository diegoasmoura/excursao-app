import { useEffect, useMemo, useState } from 'react';
import { Bus, CalendarDays, CalendarPlus, Download, Pencil, Trash2 } from 'lucide-react';
import AppShell from './components/AppShell';
import CreateWeekDialog from './components/CreateWeekDialog';
import LoginScreen from './components/LoginScreen';
import PaginationBar from './components/PaginationBar';
import PeopleScreen from './components/PeopleScreen';
import WhatsappDialog from './components/WhatsappDialog';
import WhatsappIcon from './components/WhatsappIcon';
import { placeCellClass } from './components/PlaceChip';
import SortableTh, { compareNumber, compareText, nextSort } from './components/SortableTh';
import TripDetails from './components/TripDetails';
import { useConfirm } from './context/ConfirmContext';
import { useFitPageSize } from './hooks/useFitPageSize';
import { usePagedItems } from './hooks/usePagedItems';
import { api } from './lib/api';
import { clearAuth, getStoredAuth } from './lib/auth';
import { displayPlace, formatTripDate, isUpcomingTrip } from './lib/format';
import { downloadTripPdf, tripWhatsappUrl } from './lib/tripPdf';

function tripCounts(trip) {
  const passengerCount = Number(trip.passenger_count ?? trip.passengers?.[0]?.count ?? 0);
  const paidCount = Number(trip.paid_count ?? 0);
  return {
    passengerCount,
    paidCount,
    pendingCount: Math.max(0, passengerCount - paidCount),
  };
}

function App() {
  const confirm = useConfirm();
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
  const [tripsArea, setTripsArea] = useState(null);
  const tripPageSize = useFitPageSize(tripsArea);

  const leaveSession = () => {
    clearAuth();
    setSession(null);
    setTrips([]);
    setSelectedTrip(null);
    setScreen('trips');
  };

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await api.getTrips();
    if (fetchError) {
      setError(fetchError.message);
      setTrips([]);
    } else {
      setTrips(data ?? []);
    }
    setLoading(false);
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

  const sendListedTrip = async (event, trip) => {
    event.stopPropagation();
    if (!whatsapp) {
      setWhatsappOpen(true);
      return;
    }
    const chat = window.open(tripWhatsappUrl(whatsapp, trip), '_blank');
    try {
      await downloadTripPdf(trip);
    } catch (sendError) {
      setError(sendError.message || 'Não foi possível gerar a lista.');
    }
    if (!chat) {
      window.location.assign(tripWhatsappUrl(whatsapp, trip));
    }
  };

  const downloadListedTrip = async (event, trip) => {
    event.stopPropagation();
    try {
      await downloadTripPdf(trip);
    } catch (sendError) {
      setError(sendError.message || 'Não foi possível baixar a lista.');
    }
  };

  useEffect(() => {
    setSort({ key: 'date', dir: period === 'upcoming' ? 'asc' : 'desc' });
  }, [period]);

  const filteredTrips = useMemo(() => {
    const list = trips.filter((trip) =>
      period === 'upcoming' ? isUpcomingTrip(trip.trip_date) : !isUpcomingTrip(trip.trip_date),
    );
    return [...list].sort((a, b) => {
      const countsA = tripCounts(a);
      const countsB = tripCounts(b);
      if (sort.key === 'origin') return compareText(displayPlace(a.origin), displayPlace(b.origin), sort.dir);
      if (sort.key === 'destination') return compareText(displayPlace(a.destination), displayPlace(b.destination), sort.dir);
      if (sort.key === 'occupancy') return compareNumber(countsA.passengerCount, countsB.passengerCount, sort.dir);
      if (sort.key === 'paid') return compareNumber(countsA.paidCount, countsB.paidCount, sort.dir);
      return compareText(a.trip_date, b.trip_date, sort.dir);
    });
  }, [trips, period, sort]);

  const pagedTrips = usePagedItems(filteredTrips, tripPageSize, `${period}|${sort.key}|${sort.dir}`);

  const handleNavigate = (next) => {
    setSelectedTrip(null);
    setHighlightPersonId(null);
    setScreen(next);
  };

  const openPersonTrip = async (tripId, personId) => {
    setHighlightPersonId(personId);
    setScreen('trips');
    const known = trips.find((item) => item.id === tripId);
    if (known) {
      setSelectedTrip(known);
      return;
    }
    const { data } = await api.getTrips();
    const found = (data ?? []).find((item) => item.id === tripId);
    if (data) setTrips(data);
    if (found) setSelectedTrip(found);
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

  const deleteListedTrip = async (event, trip) => {
    event.stopPropagation();
    const label = `${formatTripDate(trip.trip_date)} · ${displayPlace(trip.origin)} → ${displayPlace(trip.destination)}`;
    const ok = await confirm({
      title: 'Excluir viagem',
      message: `Excluir a viagem ${label}? As pessoas continuam na lista geral.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    const { error: deleteError } = await api.deleteTrip(trip.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTrips((current) => current.filter((item) => item.id !== trip.id));
  };

  const upcomingCount = trips.filter((trip) => isUpcomingTrip(trip.trip_date)).length;
  const pastCount = trips.length - upcomingCount;

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
      onNavigate={handleNavigate}
      onOpenSettings={() => setWhatsappOpen(true)}
      onLogout={handleLogout}
      mainClassName={selectedTrip ? 'main-content--detail' : ''}
    >
      {screen === 'people' && <PeopleScreen onOpenTrip={openPersonTrip} />}
      {screen === 'trips' && selectedTrip && (
        <TripDetails
          trip={selectedTrip}
          highlightPersonId={highlightPersonId}
          onBack={() => {
            setSelectedTrip(null);
            setHighlightPersonId(null);
          }}
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
              Próximas ({upcomingCount})
            </button>
            <button type="button" className={period === 'past' ? 'active' : ''} onClick={() => setPeriod('past')}>
              Realizadas ({pastCount})
            </button>
          </div>
          <p className="page-hint">Quando a data da viagem passar, ela sai daqui e vai para Realizadas sozinha.</p>

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
              <h3>{period === 'upcoming' ? 'Nenhuma viagem à frente' : 'Nenhuma viagem realizada'}</h3>
              <p>Use “Nova viagem” para criar a ida ou a volta.</p>
            </div>
          ) : (
            <div className="trips-table paged-table" ref={setTripsArea}>
                <div className="grid-table-wrap">
                  <table className="grid-table">
                    <colgroup>
                      <col className="col-date" />
                      <col className="col-place" />
                      <col className="col-place" />
                      <col className="col-occupancy" />
                      <col className="col-paid" />
                      <col className="col-icon" />
                      <col className="col-icon" />
                      <col className="col-icon" />
                      <col className="col-icon" />
                    </colgroup>
                    <thead>
                      <tr>
                        <SortableTh column="date" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                          Data
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
                        <th>Excluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTrips.slice.map((trip) => {
                        const { passengerCount, paidCount } = tripCounts(trip);
                        return (
                          <tr
                            key={trip.id}
                            className="is-clickable"
                            onClick={() => openTrip(trip)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') openTrip(trip);
                            }}
                            tabIndex={0}
                          >
                            <td>{formatTripDate(trip.trip_date)}</td>
                            <td className={placeCellClass(trip.origin)}>{displayPlace(trip.origin)}</td>
                            <td className={placeCellClass(trip.destination)}>{displayPlace(trip.destination)}</td>
                            <td>
                              {passengerCount} / {trip.capacity}
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
                            <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                              <button type="button" className="icon-action icon-action--danger" title="Excluir" aria-label="Excluir" onClick={(event) => deleteListedTrip(event, trip)}>
                                <Trash2 size={16} />
                              </button>
                            </td>
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
