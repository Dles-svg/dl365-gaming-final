import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EquipmentStats {
  totalListings: number;
  activeListings: number;
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  avgRentalDuration: number;
  popularTier: string;
  popularType: string;
}

export default function EquipmentAnalytics() {
  const [stats, setStats] = useState<EquipmentStats>({
    totalListings: 0,
    activeListings: 0,
    totalRentals: 0,
    activeRentals: 0,
    totalRevenue: 0,
    avgRentalDuration: 0,
    popularTier: 'N/A',
    popularType: 'N/A'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [listingsData, rentalsData] = await Promise.all([
        supabase.from('equipment_listings').select('*'),
        supabase.from('equipment_rentals').select('*')
      ]);

      const listings = listingsData.data || [];
      const rentals = rentalsData.data || [];

      const activeRentals = rentals.filter(r => r.status === 'active');
      const completedRentals = rentals.filter(r => r.status === 'completed');

      const totalRevenue = completedRentals.reduce((sum, r) => sum + (r.total_coins_paid || 0), 0);

      const avgDuration = completedRentals.length > 0
        ? completedRentals.reduce((sum, r) => sum + (r.hours_rented || 0), 0) / completedRentals.length
        : 0;

      const tierCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      listings.forEach(listing => {
        tierCounts[listing.tier] = (tierCounts[listing.tier] || 0) + 1;
        typeCounts[listing.equipment_type] = (typeCounts[listing.equipment_type] || 0) + 1;
      });

      const popularTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const popularType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      setStats({
        totalListings: listings.length,
        activeListings: listings.filter(l => l.available).length,
        totalRentals: rentals.length,
        activeRentals: activeRentals.length,
        totalRevenue,
        avgRentalDuration: avgDuration,
        popularTier,
        popularType
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold mb-6">Equipment Marketplace Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Total Equipment</div>
            <div className="text-3xl font-bold text-blue-400">{stats.totalListings}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.activeListings} active
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Total Rentals</div>
            <div className="text-3xl font-bold text-green-400">{stats.totalRentals}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.activeRentals} currently active
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.totalRevenue}</div>
            <div className="text-xs text-slate-500 mt-1">DL365 coins earned</div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Avg Rental Time</div>
            <div className="text-3xl font-bold text-purple-400">{stats.avgRentalDuration.toFixed(1)}</div>
            <div className="text-xs text-slate-500 mt-1">hours per rental</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Most Popular Tier</div>
            <div className="text-xl font-bold capitalize">{stats.popularTier}</div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Most Popular Type</div>
            <div className="text-xl font-bold capitalize">{stats.popularType}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Revenue Potential</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
            <span className="text-slate-300">If all equipment rented 24/7:</span>
            <span className="font-bold text-green-400">
              {stats.totalListings * 24 * 30} DL365/month
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
            <span className="text-slate-300">Current utilization rate:</span>
            <span className="font-bold text-blue-400">
              {stats.totalListings > 0 ? ((stats.activeRentals / stats.totalListings) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
            <span className="text-slate-300">Average per rental:</span>
            <span className="font-bold text-purple-400">
              {stats.totalRentals > 0 ? (stats.totalRevenue / stats.totalRentals).toFixed(2) : 0} DL365
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
