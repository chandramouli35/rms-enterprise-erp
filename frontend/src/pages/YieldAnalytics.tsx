import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8'];

const YieldAnalytics: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [yieldData, setYieldData] = useState<any[]>([]);
  const [lossData, setLossData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchYieldAnalytics = async () => {
      if (!activePlantId) return;
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/production/plants/${activePlantId}/yield`);
        setYieldData(data.yieldData || []);
        setLossData(data.lossData || []);
      } catch (err: any) {
        toast.error('Failed to load yield analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchYieldAnalytics();
  }, [activePlantId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Yield Analytics</h1>
      {loading ? (
        <div className="text-gray-400 text-center py-8 glass-panel">Loading analytics...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Yield Trend */}
          <div className="glass-panel p-4 flex flex-col h-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Historical Batch Yield Trend (%)</h2>
            {yieldData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                No completed batches found yet.
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} tickMargin={10} />
                    <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff', borderRadius: '8px' }} 
                      itemStyle={{ color: '#00C49F' }}
                      formatter={(value: any) => {
                        const num = Number(value);
                        return [`${!isNaN(num) ? num.toFixed(2) : value}%`, 'Yield'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="yield" 
                      stroke="#00C49F" 
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#00C49F', strokeWidth: 2 }} 
                      dot={{ r: 4, fill: '#00C49F', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Process Loss Breakdown */}
          <div className="glass-panel p-4 flex flex-col h-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Aggregate Process Loss Breakdown (MT)</h2>
            {lossData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                No process losses recorded yet.
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${percent !== undefined ? (percent * 100).toFixed(1) : 0}%)`}
                      labelLine={{ stroke: '#888', strokeWidth: 1 }}
                    >
                      {lossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff', borderRadius: '8px' }} 
                      formatter={(value: any) => {
                        const num = Number(value);
                        return [`${!isNaN(num) ? num.toFixed(2) : value} MT`, 'Loss'];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldAnalytics;
