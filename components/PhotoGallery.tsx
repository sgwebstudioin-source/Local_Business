export default function PhotoGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  if (photos.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1">
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`${alt} photo ${i + 1}`}
          className="h-52 sm:h-64 rounded-xl object-cover snap-start shrink-0 max-w-[85vw] border border-stone-200 bg-white"
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
