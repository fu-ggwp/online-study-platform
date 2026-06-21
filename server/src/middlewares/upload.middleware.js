import multer from "multer";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});
export function uploadMaterial(req, res, next) {
  upload.single("material")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Material file must be 15MB or smaller."
        : "Material file could not be uploaded.";

    res.status(400).json({ message });
  });
}
