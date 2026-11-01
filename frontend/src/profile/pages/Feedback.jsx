import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Feedback() {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/store/feedback/', { rating, comments });
      toast.success('Thank you for your feedback!');
      setComments('');
      setRating(5);
    } catch (err) {
      toast.error('Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Leave Feedback</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Let us know how we can improve your shopping experience.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200 dark:border-slate-800 w-full">
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-3">Rate your overall experience</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={(e) => {
                    const stars = e.currentTarget.parentElement.children;
                    for (let i = 0; i < stars.length; i++) {
                      stars[i].style.transform = i < star ? 'scale(1.1)' : 'scale(1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const stars = e.currentTarget.parentElement.children;
                    for (let i = 0; i < stars.length; i++) {
                      stars[i].style.transform = 'scale(1)';
                    }
                  }}
                  className="p-1 transition-transform duration-200 focus:outline-none"
                >
                  <Heart size={36} className={`transition-colors duration-200 ${star <= rating ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-200 dark:text-slate-700'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tell us more</label>
            <textarea
              required
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows="5"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-4 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="What did you like? What can we do better?"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button disabled={loading} type="submit" className="w-full sm:w-auto min-w-[160px] bg-primary-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center">
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
