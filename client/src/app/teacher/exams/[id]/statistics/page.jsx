import { ExamStatisticsClient } from "./_components/exam-statistics-client";

export default async function TeacherExamStatisticsPage({ params }) {
  const { id } = await params;

  return <ExamStatisticsClient examId={id} />;
}
