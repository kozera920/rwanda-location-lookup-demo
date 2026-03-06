import { useEffect, useMemo, useState } from "react";
import { centerBy, loadData, lookupByCoords } from "rwanda-location-lookup";

const PROVINCE_KEYS = ["Province", "PROVINCE", "province", "Prov_Nam", "PROV_NAME"];
const PROVINCE_ID_KEYS = ["Prov_ID", "PROV_ID", "province_id"];
const DISTRICT_KEYS = ["District", "DISTRICT", "district", "Name", "NAME", "name"];
const SECTOR_KEYS = ["Sector", "SECTOR", "sector", "Name", "NAME", "name"];
const CELL_KEYS = ["Cell", "CELL", "cell", "Name", "NAME", "name"];
const VILLAGE_KEYS = ["Village", "VILLAGE", "village", "Name", "NAME", "name"];

function pickFirst(props, keys) {
  if (!props) return null;
  for (const key of keys) {
    const value = props[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function SelectField({ label, value, options, onChange, disabled }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultField({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value ?? "-"}</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [dataError, setDataError] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [latitude, setLatitude] = useState("-1.944");
  const [longitude, setLongitude] = useState("30.062");
  const [coordResult, setCoordResult] = useState(null);
  const [coordError, setCoordError] = useState("");
  const [coordBusy, setCoordBusy] = useState(false);

  const [selection, setSelection] = useState({
    province: "",
    district: "",
    sector: "",
    cell: "",
    village: "",
  });
  const [reverseResult, setReverseResult] = useState(null);
  const [reverseError, setReverseError] = useState("");
  const [reverseBusy, setReverseBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoadingData(true);
      setDataError("");
      try {
        const loaded = await loadData();
        if (active) setData(loaded);
      } catch (error) {
        if (active) setDataError(error?.message || "Failed to load bundled Rwanda GeoJSON data.");
      } finally {
        if (active) setIsLoadingData(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const provinceNameById = useMemo(() => {
    const map = new Map();
    for (const collectionName of ["sectors", "cells", "villages"]) {
      const collection = data?.[collectionName];
      if (!collection?.features) continue;
      for (const feature of collection.features) {
        const props = feature?.properties || {};
        const provinceId = pickFirst(props, PROVINCE_ID_KEYS);
        const province = pickFirst(props, PROVINCE_KEYS);
        if (!provinceId || !province) continue;
        if (!map.has(provinceId) || !province.includes("/")) {
          map.set(provinceId, province);
        }
      }
    }
    return map;
  }, [data]);

  const hierarchyRows = useMemo(() => {
    if (!data?.villages?.features) return [];
    return data.villages.features
      .map((feature) => {
        const props = feature?.properties || {};
        const provinceId = pickFirst(props, PROVINCE_ID_KEYS);
        const province = provinceNameById.get(provinceId) || pickFirst(props, PROVINCE_KEYS);
        const district = pickFirst(props, DISTRICT_KEYS);
        const sector = pickFirst(props, SECTOR_KEYS);
        const cell = pickFirst(props, CELL_KEYS);
        const village = pickFirst(props, VILLAGE_KEYS);
        if (!province || !district || !sector || !cell || !village) return null;
        return { province, district, sector, cell, village };
      })
      .filter(Boolean);
  }, [data, provinceNameById]);

  const provinceOptions = useMemo(
    () => uniqueSorted(hierarchyRows.map((row) => row.province)),
    [hierarchyRows]
  );

  const districtOptions = useMemo(() => {
    if (!selection.province) return [];
    return uniqueSorted(
      hierarchyRows
        .filter((row) => row.province === selection.province)
        .map((row) => row.district)
    );
  }, [hierarchyRows, selection.province]);

  const sectorOptions = useMemo(() => {
    if (!selection.province || !selection.district) return [];
    return uniqueSorted(
      hierarchyRows
        .filter(
          (row) =>
            row.province === selection.province && row.district === selection.district
        )
        .map((row) => row.sector)
    );
  }, [hierarchyRows, selection.province, selection.district]);

  const cellOptions = useMemo(() => {
    if (!selection.province || !selection.district || !selection.sector) return [];
    return uniqueSorted(
      hierarchyRows
        .filter(
          (row) =>
            row.province === selection.province &&
            row.district === selection.district &&
            row.sector === selection.sector
        )
        .map((row) => row.cell)
    );
  }, [hierarchyRows, selection.province, selection.district, selection.sector]);

  const villageOptions = useMemo(() => {
    if (
      !selection.province ||
      !selection.district ||
      !selection.sector ||
      !selection.cell
    ) {
      return [];
    }
    return uniqueSorted(
      hierarchyRows
        .filter(
          (row) =>
            row.province === selection.province &&
            row.district === selection.district &&
            row.sector === selection.sector &&
            row.cell === selection.cell
        )
        .map((row) => row.village)
    );
  }, [
    hierarchyRows,
    selection.province,
    selection.district,
    selection.sector,
    selection.cell,
  ]);

  const reverseMapLink = reverseResult
    ? `https://www.google.com/maps?q=${reverseResult.latitude},${reverseResult.longitude}`
    : "";

  function setSelectionValue(level, value) {
    setSelection((current) => {
      if (level === "province") {
        return { province: value, district: "", sector: "", cell: "", village: "" };
      }
      if (level === "district") {
        return { ...current, district: value, sector: "", cell: "", village: "" };
      }
      if (level === "sector") {
        return { ...current, sector: value, cell: "", village: "" };
      }
      if (level === "cell") {
        return { ...current, cell: value, village: "" };
      }
      return { ...current, village: value };
    });
  }

  async function runCoordinateLookup(inputLat, inputLng) {
    const lat = Number(inputLat);
    const lng = Number(inputLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Latitude and longitude must be valid numbers.");
    }
    if (!data) {
      throw new Error("Rwanda boundary data is still loading.");
    }

    const result = lookupByCoords({ latitude: lat, longitude: lng, data });
    if (!result) {
      throw new Error("No matching administrative hierarchy for those coordinates.");
    }

    return result;
  }

  async function handleCoordinateSubmit(event) {
    event.preventDefault();
    setCoordBusy(true);
    setCoordError("");

    try {
      const result = await runCoordinateLookup(latitude, longitude);
      setCoordResult(result);
    } catch (error) {
      setCoordResult(null);
      setCoordError(error?.message || "Coordinate lookup failed.");
    } finally {
      setCoordBusy(false);
    }
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      setCoordError("Geolocation is not supported by your browser.");
      return;
    }

    setCoordBusy(true);
    setCoordError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));

        try {
          const result = await runCoordinateLookup(lat, lng);
          setCoordResult(result);
        } catch (error) {
          setCoordResult(null);
          setCoordError(error?.message || "Coordinate lookup failed.");
        } finally {
          setCoordBusy(false);
        }
      },
      (error) => {
        setCoordBusy(false);
        setCoordError(error.message || "Failed to access current location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function handleReverseLookup(event) {
    event.preventDefault();
    setReverseBusy(true);
    setReverseError("");

    try {
      if (!data) throw new Error("Rwanda boundary data is still loading.");
      if (!selection.province) throw new Error("Select at least a province.");

      const result = centerBy({ ...selection, data });
      if (!result) {
        throw new Error("No center point found for the selected hierarchy.");
      }
      setReverseResult(result);
    } catch (error) {
      setReverseResult(null);
      setReverseError(error?.message || "Reverse lookup failed.");
    } finally {
      setReverseBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Rwanda Location Lookup Demo</h1>
          <p className="mt-1 text-sm text-slate-600">
           Demo for forward lookup (coordinates to hierarchy) and reverse lookup
            (hierarchy to center coordinates).
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Data status:{" "}
            <span className="font-semibold">
              {isLoadingData ? "Loading bundled data..." : "Ready"}
            </span>
          </p>
          {dataError ? <p className="mt-2 text-red-600">{dataError}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            Geolocation works on HTTPS (or localhost) and requires browser permission.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">1) Coordinates to Hierarchy</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter latitude/longitude manually or use your device location.
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleCoordinateSubmit}>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">Latitude</span>
                <input
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="-1.944"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">Longitude</span>
                <input
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="30.062"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={coordBusy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {coordBusy ? "Looking up..." : "Lookup Coordinates"}
                </button>
                <button
                  type="button"
                  disabled={coordBusy}
                  onClick={handleCurrentLocation}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  Use Current Location
                </button>
              </div>
            </form>

            {coordError ? <p className="mt-3 text-sm text-red-600">{coordError}</p> : null}

            {coordResult ? (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ResultField label="Province" value={coordResult.province} />
                <ResultField label="District" value={coordResult.district} />
                <ResultField label="Sector" value={coordResult.sector} />
                <ResultField label="Cell" value={coordResult.cell} />
                <ResultField label="Village" value={coordResult.village} />
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">2) Hierarchy to Center</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select Province to Village and get center latitude/longitude.
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleReverseLookup}>
              <SelectField
                label="Province"
                value={selection.province}
                options={provinceOptions}
                disabled={isLoadingData || Boolean(dataError)}
                onChange={(value) => setSelectionValue("province", value)}
              />
              <SelectField
                label="District"
                value={selection.district}
                options={districtOptions}
                disabled={!selection.province}
                onChange={(value) => setSelectionValue("district", value)}
              />
              <SelectField
                label="Sector"
                value={selection.sector}
                options={sectorOptions}
                disabled={!selection.district}
                onChange={(value) => setSelectionValue("sector", value)}
              />
              <SelectField
                label="Cell"
                value={selection.cell}
                options={cellOptions}
                disabled={!selection.sector}
                onChange={(value) => setSelectionValue("cell", value)}
              />
              <SelectField
                label="Village"
                value={selection.village}
                options={villageOptions}
                disabled={!selection.cell}
                onChange={(value) => setSelectionValue("village", value)}
              />

              <button
                type="submit"
                disabled={reverseBusy}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {reverseBusy ? "Calculating..." : "Find Center Coordinates"}
              </button>
            </form>

            {reverseError ? <p className="mt-3 text-sm text-red-600">{reverseError}</p> : null}

            {reverseResult ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ResultField label="Latitude" value={reverseResult.latitude} />
                  <ResultField label="Longitude" value={reverseResult.longitude} />
                  <ResultField label="Matched Level" value={reverseResult.level} />
                  <ResultField label="Matched Features" value={reverseResult.matchCount} />
                </div>
                <a
                  href={reverseMapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
                >
                  Open Center in Google Maps
                </a>
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
