import { useState } from 'react';
import { Check, X, HelpCircle, Award, ListFilter } from 'lucide-react';

const QuestionForm = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    questionText: question?.questionText || '',
    optionA: question?.optionA || '',
    optionB: question?.optionB || '',
    optionC: question?.optionC || '',
    optionD: question?.optionD || '',
    correctAnswer: question?.correctAnswer || 'A',
    marks: question?.marks || 2,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'marks' ? Number(value) : value,
    }));
  };

  const handleCorrectAnswerSelect = (optionKey) => {
    setFormData((prev) => ({
      ...prev,
      correctAnswer: optionKey,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Question Statement</span>
        </label>
        <textarea
          name="questionText"
          value={formData.questionText}
          onChange={handleChange}
          rows={3}
          required
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm text-slate-900 placeholder:text-slate-400"
          placeholder="Type the comprehensive exam question statement here..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ListFilter className="w-3.5 h-3.5 text-blue-600" />
            <span>Multiple Choice Options</span>
          </label>
          <span className="text-xs text-slate-500">
            Click option letter badge to designate correct answer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'A', name: 'optionA', label: 'Option A' },
            { key: 'B', name: 'optionB', label: 'Option B' },
            { key: 'C', name: 'optionC', label: 'Option C' },
            { key: 'D', name: 'optionD', label: 'Option D' },
          ].map(({ key, name, label }) => {
            const isCorrect = formData.correctAnswer === key;
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCorrectAnswerSelect(key)}
                      className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center transition-all ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {key}
                    </button>
                    <span className="text-xs font-semibold text-slate-700">
                      {label}
                    </span>
                  </div>
                  {isCorrect && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Correct
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  required
                  placeholder={`Enter ${label} text`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Selected Correct Answer
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['A', 'B', 'C', 'D'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleCorrectAnswerSelect(opt)}
                className={`py-2 text-sm font-bold rounded-lg border transition-all ${
                  formData.correctAnswer === opt
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>Assigned Marks</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="marks"
              value={formData.marks}
              onChange={handleChange}
              min="1"
              max="20"
              required
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            />
            <div className="flex gap-1">
              {[1, 2, 4, 5].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, marks: preset }))}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border ${
                    formData.marks === preset
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset}M
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all text-sm flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Save Question</span>
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;