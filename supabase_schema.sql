-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    trip_date DATE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 45,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create passengers table
CREATE TABLE IF NOT EXISTS public.passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rg TEXT,
    phone TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for anon (assuming a simple public app for now)
-- In a real production app, you would want to restrict this!
CREATE POLICY "Allow anonymous read access on trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on trips" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on trips" ON public.trips FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on trips" ON public.trips FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on passengers" ON public.passengers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on passengers" ON public.passengers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on passengers" ON public.passengers FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on passengers" ON public.passengers FOR DELETE USING (true);
