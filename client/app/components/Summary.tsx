import React from 'react'
import ScoreGauge from './ScoreGauge';
import ScoreBadge from './ScoreBadge';


const Category = ({title, score}:{title:string, score:number}) => {

  const textColor = score > 70 ? 'text-emerald' : score>49 ? 'text-amber-300' : 'text-red-400'; 

  return(
    <div className="resume-summary">
     <div className='category'>
      <div className='flex flex-row gap-2 items-center justify-center '>
        <p className='text-2xl'>{title}</p>
        <ScoreBadge score={score} />
      </div>
       <p className='text-2xl '>
        <span className={textColor}>{score}</span>/100
       </p>
     </div>
    </div>
  )
}

const Summary = ({feedback}:{feedback: Feedback}) => {
  return (
    <div className="glass-panel w-full ">
      <div className="flex flex-row items-center p-4 gap-8">
        <ScoreGauge score={feedback.overallScore}/>
        <div className='flex felx-col gap-2 '>
          <h2 className='text-2xl font-bold'>Your Resume Score</h2>
          <p className="text-sm text-white/50">
            This score is calculated based on the variables listed below.
          </p>
        </div>
      </div>

      <Category title="Tone & Style" score={feedback.toneAndStyle.score} />
      <Category title="Content" score={feedback.content.score} />
      <Category title="Structure" score={feedback.structure.score} />
      <Category title="Skills" score={feedback.skills.score} />
    </div>
  )
}

export default Summary;