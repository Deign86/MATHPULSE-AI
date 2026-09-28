# src/components/notebook/

## Responsibility
- Present supplemental video and micro-lesson content that accompanies a learner's notebook/module work.
- Files: MicroLessonCard, MicroLessonDeck, VideoLessonSection; test: MicroLessonDeck.

## Design
- Cards and sections display parent-provided lesson content; deck coordinates active card/progression and handles completion or selection callbacks.
- Props represent lesson title/body/media/sequence and completion handlers; state includes active lesson index and any expanded/playback state.

## Flow
- Learner opens supplemental lesson → parent supplies lesson deck/resource data → deck selects current lesson and renders card/video section → learner navigates or completes → callback informs parent and deck advances/rerenders.

## Integration
- Used by notebook/module lesson surfaces, including root module/lesson components; lesson content comes from curriculum/module data and parent service queries.
- Shared carousel, buttons, cards, and media controls are drawn from `components/ui/` where applicable; no independent auth/session layer.
