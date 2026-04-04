/**
 * EventImageHandler - Maneja la lógica de subida de imágenes para eventos
 * Reutilizable entre create-event y edit-event
 */

interface PlanStats {
  max_images_per_event: number | null;
  [key: string]: any;
}

interface ImageHandlerOptions {
  imageInputId?: string;
  uploadWrapperId?: string;
  imageCountSpanId?: string;
  fileUploadLabelId?: string;
  existingImagesGridId?: string;
  imagesToRemoveInputId?: string;
  imageGalleryId?: string;
  showError: (inputId: string, message: string) => void;
  clearErrors?: () => void;
}

export class EventImageHandler {
  private imagesInput: HTMLInputElement | null;
  private imagesUploadWrapper: HTMLElement | null;
  private imageCountSpan: HTMLElement | null;
  private fileUploadLabel: HTMLElement | null;
  private existingImagesGrid: HTMLElement | null;
  private imagesToRemoveInput: HTMLInputElement | null;
  private imageGallery: any;
  private imagesToRemove: string[] = [];
  private existingImagesCount: number = 0;
  private planStats: PlanStats | null = null;
  private showError: (inputId: string, message: string) => void;
  private clearErrors?: () => void;
  private isUpdatingInput: boolean = false; // Bandera para evitar loops

  constructor(options: ImageHandlerOptions) {
    this.imagesInput = document.getElementById(
      options.imageInputId || "event_images"
    ) as HTMLInputElement;
    this.imagesUploadWrapper = document.getElementById(
      options.uploadWrapperId || "images-upload-wrapper"
    );
    this.imageCountSpan = document.getElementById(
      options.imageCountSpanId || "image-count"
    );
    this.fileUploadLabel = document.getElementById(
      options.fileUploadLabelId || "file-upload-label"
    );
    this.existingImagesGrid = document.getElementById(
      options.existingImagesGridId || "existing-images-grid"
    );
    this.imagesToRemoveInput = document.getElementById(
      options.imagesToRemoveInputId || "images_to_remove"
    ) as HTMLInputElement;
    this.showError = options.showError;
    this.clearErrors = options.clearErrors;

    // Inicializar ImageGalleryPreview
    const ImageGalleryPreviewClass = (window as any).ImageGalleryPreview;
    const galleryId = options.imageGalleryId || "new-images-preview";
    this.imageGallery = new ImageGalleryPreviewClass(galleryId, 10);

    // Contar imágenes existentes
    this.existingImagesCount =
      this.existingImagesGrid?.querySelectorAll(".image-item").length || 0;

    this.init();
  }

  private init() {
    this.setupEventListeners();
    this.updateImageCount();
  }

  public setPlanStats(stats: PlanStats) {
    this.planStats = stats;
    this.updateImageCount();
  }

  private setupEventListeners() {
    // Actualizar input cuando cambie la galería
    this.imageGallery.onChange((files: File[]) => {
      if (!this.imagesInput) return;

      // Activar bandera para evitar loop
      this.isUpdatingInput = true;

      const dataTransfer = new DataTransfer();
      files.forEach((file) => {
        dataTransfer.items.add(file);
      });
      this.imagesInput.files = dataTransfer.files;
      this.updateImageCount();

      // Desactivar bandera después de un tick
      setTimeout(() => {
        this.isUpdatingInput = false;
      }, 0);
    });

    // Manejar cambio de archivos
    this.imagesInput?.addEventListener("change", (e) => {
      // Ignorar si estamos actualizando el input nosotros mismos
      if (this.isUpdatingInput) return;

      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFilesSelect(files);
      }
    });

    // Drag and drop
    this.fileUploadLabel?.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.fileUploadLabel?.classList.add("drag-over");
    });

    this.fileUploadLabel?.addEventListener("dragleave", (e) => {
      e.preventDefault();
      this.fileUploadLabel?.classList.remove("drag-over");
    });

    this.fileUploadLabel?.addEventListener("drop", (e) => {
      e.preventDefault();
      this.fileUploadLabel?.classList.remove("drag-over");

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith("image/")) {
            validFiles.push(files[i]);
          }
        }

        if (validFiles.length > 0 && this.imagesInput) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          this.imagesInput.files = dataTransfer.files;
          this.handleFilesSelect(dataTransfer.files);
        } else {
          this.showError(
            "event_images",
            "Por favor selecciona solo imágenes válidas"
          );
        }
      }
    });

    // Manejar eliminación de imágenes existentes
    const removeExistingBtns = document.querySelectorAll(
      ".btn-remove-existing[data-image-id]"
    );
    removeExistingBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleRemoveExisting(btn as HTMLElement);
      });
    });
  }

  private getTotalImages(): number {
    return this.existingImagesCount + this.imageGallery.getCount();
  }

  private updateImageCount() {
    const totalImages = this.getTotalImages();
    const maxImages = this.planStats?.max_images_per_event || 10;

    if (this.imageCountSpan) {
      this.imageCountSpan.textContent = `(${totalImages}/${maxImages})`;
    }

    // Ocultar el upload wrapper si llegamos al límite del plan
    if (this.imagesUploadWrapper) {
      this.imagesUploadWrapper.style.display =
        totalImages >= maxImages ? "none" : "";
    }
  }

  private handleFilesSelect(files: FileList) {
    const filesArray = Array.from(files);

    // Obtener límite del plan
    const maxImages = this.planStats?.max_images_per_event || 1;

    // Validar límite total según plan
    const totalImages = this.getTotalImages();
    const newFilesCount = filesArray.length;

    if (totalImages + newFilesCount > maxImages) {
      this.showError(
        "event_images",
        `Tu plan permite hasta ${maxImages} imagen${maxImages > 1 ? "es" : ""}. Actualmente tienes ${totalImages}.`
      );
      return;
    }

    // Validar y agregar archivos
    const validFiles: File[] = [];

    for (const file of filesArray) {
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showError(
          "event_images",
          `La imagen "${file.name}" no debe superar los 5MB`
        );
        continue;
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        this.showError(
          "event_images",
          `"${file.name}" no es una imagen válida`
        );
        continue;
      }

      validFiles.push(file);
    }

    // Si no hay archivos válidos, salir
    if (validFiles.length === 0) {
      return;
    }

    // Agregar archivos válidos a la galería
    const success = this.imageGallery.addImages(validFiles);

    if (!success) {
      this.showError(
        "event_images",
        `No se pudieron agregar todas las imágenes. Límite: ${maxImages}`
      );
    }

    // Limpiar errores si todo salió bien
    if (this.clearErrors) {
      this.clearErrors();
    }
  }

  private handleRemoveExisting(btn: HTMLElement) {
    const imageId = btn.dataset.imageId;
    const imageItem = btn.closest(".image-item") as HTMLElement;

    if (imageId && imageItem) {
      // Agregar a lista de imágenes a eliminar
      this.imagesToRemove.push(imageId);
      if (this.imagesToRemoveInput) {
        this.imagesToRemoveInput.value = this.imagesToRemove.join(",");
      }

      // Eliminar del DOM
      imageItem.remove();
      this.existingImagesCount--;
      this.updateImageCount();

      // Si el grid está vacío, ocultarlo
      const remainingItems =
        this.existingImagesGrid?.querySelectorAll(".image-item").length || 0;
      if (remainingItems === 0 && this.existingImagesGrid) {
        this.existingImagesGrid.style.display = "none";
      }
    }
  }

  public getFiles(): File[] {
    return this.imageGallery.getFiles();
  }

  public getImagesToRemove(): string[] {
    return this.imagesToRemove;
  }

  public getTotalImageCount(): number {
    return this.getTotalImages();
  }
}
