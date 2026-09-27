import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Paginated, Patient } from "../types";

export function PatientsListPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Patient>>("/patients", { params: { search, page: 1, pageSize: 20 } });
      return data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Patients</h1>
        <Link to="/patients/new" className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md">
          + New Patient
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name, file number, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md border border-slate-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {isLoading && <div className="text-slate-500 text-sm">Loading patients...</div>}
      {error && <div className="text-red-600 text-sm">Failed to load patients.</div>}

      {data && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">File #</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Gender</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Departments</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/patients/${p.id}`} className="text-brand-600 hover:underline font-medium">
                      {p.fileNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.fullName}</td>
                  <td className="px-4 py-2">{p.gender === "MALE" ? "Male" : "Female"}</td>
                  <td className="px-4 py-2">{p.phoneNumber || "—"}</td>
                  <td className="px-4 py-2">{p.enrollments.map((e) => e.department.name).join(", ")}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
