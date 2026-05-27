import type { MutableRefObject } from "react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { platformOptions } from "@/lib/graphics";
import { type Link as LinkType } from "@/lib/api";
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown } from "lucide-react";

type LinksTabProps = {
  isAddLinkOpen: boolean;
  setIsAddLinkOpen: (open: boolean) => void;
  orderedLinks: LinkType[];
  isLinksLoading: boolean;
  isLinksError: boolean;
  linksErrorMessage: string;
  onRetryLinks: () => void;
  links: LinkType[] | undefined;
  form: any;
  onSubmit: (values: any) => void;
  selectedPlatform: { urlHint?: string } | undefined;
  addLinkMutation: { isPending: boolean };
  draggedLinkId: number | null;
  setDraggedLinkId: (id: number | null) => void;
  dragStartOrderRef: MutableRefObject<number[]>;
  lastOverIdRef: MutableRefObject<number | null>;
  moveLink: (dragId: number, targetId: number) => void;
  handleLinkDrop: (targetId: number, draggedId?: number) => void;
  onToggleLinkActive: (id: number, isActive: boolean) => void;
  getPlatformIcon: (icon?: string | null) => any;
  deleteLinkMutation: { mutate: (id: number) => void };
  hasUnsavedChanges: boolean;
  isSavingChanges: boolean;
  onSaveChanges: (links: LinkType[]) => void;
};

export const LinksTab = memo(function LinksTab({
  isAddLinkOpen,
  setIsAddLinkOpen,
  orderedLinks,
  isLinksLoading,
  isLinksError,
  linksErrorMessage,
  onRetryLinks,
  links,
  form,
  onSubmit,
  selectedPlatform,
  addLinkMutation,
  draggedLinkId,
  setDraggedLinkId,
  dragStartOrderRef,
  lastOverIdRef,
  moveLink,
  handleLinkDrop,
  onToggleLinkActive,
  getPlatformIcon,
  deleteLinkMutation,
  hasUnsavedChanges,
  isSavingChanges,
  onSaveChanges,
}: LinksTabProps) {
  const handleMoveUp = (id: number) => {
    const index = orderedLinks.findIndex((link) => link.id === id);
    if (index > 0) {
      moveLink(id, orderedLinks[index - 1].id);
    }
  };

  const handleMoveDown = (id: number) => {
    const index = orderedLinks.findIndex((link) => link.id === id);
    if (index < orderedLinks.length - 1) {
      moveLink(id, orderedLinks[index + 1].id);
    }
  };

  const handleTouchStart = (event: React.TouchEvent, linkId: number) => {
    setDraggedLinkId(linkId);
    dragStartOrderRef.current = orderedLinks.map((item) => item.id);
  };

  const handleTouchMove = (event: React.TouchEvent, linkId: number) => {
    if (draggedLinkId === null) return;
    
    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;
    
    const cardElement = element.closest("[data-link-id]");
    if (!cardElement) return;
    
    const targetId = Number(cardElement.getAttribute("data-link-id"));
    if (Number.isNaN(targetId) || targetId === draggedLinkId) return;
    
    moveLink(draggedLinkId, targetId);
  };

  const handleTouchEnd = (event: React.TouchEvent, linkId: number) => {
    if (draggedLinkId !== null) {
      handleLinkDrop(linkId, draggedLinkId);
      setDraggedLinkId(null);
    }
  };

  return (
    <>
      <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DialogTrigger asChild>
                  <Button
                    className="w-full h-12 border-dashed border-2 bg-transparent text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 shadow-none"
                    disabled={orderedLinks.length >= 12}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add New Link{" "}
                    {orderedLinks.length > 0 && `(${orderedLinks.length}/12)`}
                  </Button>
                </DialogTrigger>
              </div>
            </TooltipTrigger>
            {orderedLinks.length >= 12 && (
              <TooltipContent>
                <p>Maximum of 12 links allowed</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Link</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-3">
                        {platformOptions.map((option) => {
                          const isSelected = field.value === option.key;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => {
                                field.onChange(option.key);
                                if (!form.getValues("title")) {
                                  form.setValue("title", option.label, {
                                    shouldDirty: true,
                                  });
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40",
                              )}
                            >
                              {(() => {
                                const Icon = option.icon;
                                return <Icon className="h-5 w-5" />;
                              })()}
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My Portfolio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          selectedPlatform?.urlHint || "https://example.com"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={addLinkMutation.isPending}>
                  {addLinkMutation.isPending ? "Adding..." : "Add Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {isLinksLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading links...
          </div>
        ) : isLinksError ? (
          <div className="text-center py-10 border rounded-xl border-dashed space-y-3">
            <p className="text-sm text-destructive">{linksErrorMessage}</p>
            <Button variant="outline" size="sm" onClick={onRetryLinks}>
              Retry
            </Button>
          </div>
        ) : links?.length === 0 ? (
          <div className="text-center py-10 border rounded-xl border-dashed">
            <p className="text-muted-foreground">
              No links yet. Add your first one above!
            </p>
          </div>
        ) : (
          orderedLinks?.map((link, index) => (
            <Card
              key={link.id}
              data-link-id={link.id}
              className={cn(
                "group hover:shadow-md transition-shadow",
                draggedLinkId === link.id && "opacity-50 border-primary border-2",
              )}
              draggable
              onDragStart={(event) => {
                setDraggedLinkId(link.id);
                dragStartOrderRef.current = orderedLinks.map((item) => item.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(link.id));
              }}
              onDragEnd={() => {
                setDraggedLinkId(null);
                lastOverIdRef.current = null;
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedLinkId === null) return;
                if (lastOverIdRef.current === link.id) return;
                lastOverIdRef.current = link.id;
                moveLink(draggedLinkId, link.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const data = event.dataTransfer.getData("text/plain");
                const parsed = Number(data);
                handleLinkDrop(
                  link.id,
                  Number.isNaN(parsed) ? undefined : parsed,
                );
              }}
            >
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
                {/* Reordering Controls */}
                <div className="flex items-center shrink-0 select-none">
                  {/* Desktop Grip Handle (PC screen only) */}
                  <div className="hidden md:block cursor-move text-muted-foreground/45 hover:text-muted-foreground p-1.5 rounded-md hover:bg-muted">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {/* Mobile Up/Down Arrows (Phone screen only) */}
                  <div className="flex flex-col gap-0.5 md:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-muted disabled:opacity-20 shrink-0"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(link.id)}
                      aria-label="Move Link Up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-muted disabled:opacity-20 shrink-0"
                      disabled={index === orderedLinks.length - 1}
                      onClick={() => handleMoveDown(link.id)}
                      aria-label="Move Link Down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {(() => {
                    const Icon = getPlatformIcon(link.icon);
                    return <Icon className="h-5 w-5 sm:h-6 sm:w-6" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{link.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {link.url}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Switch
                    checked={link.isActive}
                    onCheckedChange={(checked) =>
                      onToggleLinkActive(link.id, checked)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteLinkMutation.mutate(link.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {orderedLinks.length > 0 ? (
        <div className="flex justify-end">
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            disabled={!hasUnsavedChanges || isSavingChanges}
            onClick={() =>
              onSaveChanges(
                orderedLinks.map((link, index) => ({
                  ...link,
                  sortOrder: index,
                })),
              )
            }
          >
            {isSavingChanges ? "Saving..." : "Save order"}
          </Button>
        </div>
      ) : null}
    </>
  );
});
