import { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = () => {
    setLoading(true);
    api.get('/store/feedback/')
      .then(res => setFeedbacks(res.data.results || res.data))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load feedback');
      })
      .finally(() => setLoading(false));
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await api.delete(`/store/feedback/${id}/`);
      toast.success('Feedback deleted');
      fetchFeedbacks();
    } catch (err) {
      toast.error('Failed to delete feedback');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customer Feedback</h1>
        <p className="text-slate-500 mt-1">See what your customers are saying about your store.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-1">No feedback yet</h3>
            <p className="text-slate-500">When customers leave feedback, it will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {fb.customer_name ? fb.customer_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{fb.customer_name || 'Anonymous'}</h4>
                      <p className="text-sm text-slate-500">{new Date(fb.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>
                
                {fb.comments ? (
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{fb.comments}</p>
                ) : (
                  <p className="text-slate-400 italic">No comments provided.</p>
                )}

                <div className="mt-4 flex justify-end">
                  <button onClick={() => deleteFeedback(fb.id)} className="text-sm text-rose-500 font-semibold hover:text-rose-700 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
