import { COURSES, type CourseKey } from '../domain/types'

export function Chip({ course }: { course: CourseKey }) {
  const c = COURSES[course] ?? COURSES.MATH
  return (
    <span className="chip" style={{ color: `var(${c.cssVar})` }}>
      {c.code}
    </span>
  )
}
