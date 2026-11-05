import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAppData } from './data/appData'
import { NowPage } from './features/now/NowPage'
import { FlashPage } from './features/flash/FlashPage'
import { ReviewPage } from './features/review/ReviewPage'
import { EvalsPage } from './features/evals/EvalsPage'
import { DataPage } from './features/data/DataPage'

export default function App() {
  const { ready } = useAppData()
  if (!ready)
    return (
      <div className="thinking" style={{ padding: 24 }}>
        <span className="pulse" />
        Chargement des données…
      </div>
    )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<NowPage />} />
        <Route path="flash" element={<FlashPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="evals" element={<EvalsPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
