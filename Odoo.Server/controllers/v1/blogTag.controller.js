import BlogTag from "../../models/BlogTag.js";
import BlogMaster from "../../models/BlogMaster.js";
import { formatReferenceMessage } from "../../utils/referenceHelper.js";

const escapeRegex = (str = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const createSlug = (text = "") => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

/** Legacy CMS docs used `Title` / `IsActive`. */
const normalizeTag = (doc) => {
  const o = doc?.toObject ? doc.toObject() : { ...doc };
  const tagName = o.tagName || o.Title || o.title || "";
  return {
    ...o,
    tagName,
    slug: o.slug || createSlug(tagName),
    isActive: o.isActive ?? o.IsActive ?? true,
  };
};

export const createBlogTag = async (req, res) => {
  try {
    const { tagName, isActive } = req.body;

    if (!tagName) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Tag Name is required",
      });
    }

    const slug = createSlug(tagName);
    const existing = await BlogTag.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "A tag with this name already exists",
      });
    }

    const blogTag = new BlogTag({
      tagName,
      slug,
      isActive: isActive !== undefined ? isActive : true,
    });

    await blogTag.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Blog Tag created successfully",
      data: blogTag,
    });
  } catch (error) {
    console.error("Error creating blog tag:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message || "Internal server error",
    });
  }
};

export const updateBlogTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { tagName, isActive } = req.body;

    const tag = await BlogTag.findById(id);
    if (!tag) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Blog Tag not found",
      });
    }

    let slug = tag.slug;
    if (tagName && tagName !== tag.tagName) {
      slug = createSlug(tagName);
      const existing = await BlogTag.findOne({ slug, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          isOk: false,
          status: 400,
          message: "Another tag with this name already exists",
        });
      }
    }

    tag.tagName = tagName !== undefined ? tagName : tag.tagName;
    tag.slug = slug;
    tag.isActive = isActive !== undefined ? isActive : tag.isActive;

    await tag.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Blog Tag updated successfully",
      data: tag,
    });
  } catch (error) {
    console.error("Error updating blog tag:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteBlogTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await BlogTag.findById(id);

    if (!tag) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Blog Tag not found",
      });
    }

    const blogCount = await BlogMaster.countDocuments({
      $or: [
        { tags: { $regex: `^${escapeRegex(tag.tagName)}$`, $options: "i" } },
        { tags: { $regex: `^${escapeRegex(tag.slug)}$`, $options: "i" } },
      ],
    });
    if (blogCount > 0) {
      const details = [{ model: "BlogMaster", path: "tags", count: blogCount }];
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Cannot delete blog tag. It is being used by other records.",
        totalReferences: blogCount,
        references: details,
        formattedMessage: formatReferenceMessage(details),
      });
    }

    await BlogTag.findByIdAndDelete(id);

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Blog Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog tag:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message || "Internal server error",
    });
  }
};

export const listAllBlogTags = async (req, res) => {
  try {
    const tags = await BlogTag.find().sort({ tagName: 1 });
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: tags.map(normalizeTag),
    });
  } catch (error) {
    console.error("Error listing blog tags:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message || "Internal server error",
    });
  }
};

export const listBlogTagsByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive } = req.body;

    const safeSkip = Number.isInteger(Number(skip)) ? Number(skip) : 0;
    const safePerPage = Number.isInteger(Number(per_page)) ? Number(per_page) : 10;

    let matchCondition = {};
    const wantActive = isActive !== undefined && isActive !== "";
    const activeVal = isActive === true || isActive === "true";
    if (wantActive) {
      matchCondition.$or = activeVal
        ? [{ isActive: true }, { IsActive: true }]
        : [{ isActive: false }, { IsActive: false }];
    }

    const safeMatch = typeof match === "string" ? match.trim() : "";
    if (safeMatch) {
      const escaped = escapeRegex(safeMatch);
      const textOr = [
        { tagName: { $regex: escaped, $options: "i" } },
        { Title: { $regex: escaped, $options: "i" } },
      ];
      matchCondition = wantActive
        ? { $and: [{ $or: matchCondition.$or }, { $or: textOr }] }
        : { $or: textOr };
    }

    const allowedFields = ["tagName", "isActive", "createdAt"];
    const safeSortField = allowedFields.includes(sorton) ? sorton : "createdAt";
    const sortOrder = sortdir === "asc" ? 1 : -1;

    const totalCount = await BlogTag.countDocuments(matchCondition);
    const data = await BlogTag.find(matchCondition)
      .sort({ [safeSortField]: sortOrder })
      .skip(safeSkip)
      .limit(safePerPage);

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: [
        {
          count: totalCount,
          data: data.map(normalizeTag),
        },
      ],
    });
  } catch (error) {
    console.error("Error listing blog tags by params:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message || "Internal server error",
    });
  }
};
