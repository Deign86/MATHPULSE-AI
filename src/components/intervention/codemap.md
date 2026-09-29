# src/components/intervention/

## Responsibility
- A focused intervention lesson/video step used to guide a learner through a recommended remediation activity.
- Files: InterventionVideoStep.

## Design
- `InterventionVideoStep` receives lesson/video information, completion/progress state, and callbacks from its intervention flow parent; media/step selection is parent-owned.
- Local state is limited to playback or step interaction when required; render reflects the supplied intervention item and completion state.

## Flow
- Learner opens an assigned intervention → parent selects step and supplies video/resource details → learner watches or marks step complete → callback updates intervention progress → parent advances or displays completion.

## Integration
- Used by intervention/learning-path flows composed from root components; intervention records and learner status are supplied by the parent/service layer.
- May coordinate with root `InterventionStepGuide` and risk-panel recommendations; shared media/dialog/button primitives are sourced from `components/ui/`.
